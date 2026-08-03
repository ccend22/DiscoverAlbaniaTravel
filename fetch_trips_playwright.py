"""Fetch trip-planner API responses for a batch of days using a real Chromium
session (via Playwright), instead of raw curl/urllib.

The plain-curl path (run_fetch_week.sh) gets blocked by the site's Incapsula
bot-challenge -- every response comes back as the same JS-challenge stub, not
real data. A real browser context (same recipe as scrape_etransport.py)
establishes a valid session first, then reuses its cookies for the API calls,
which is how the original Monday batch worked.

Resumable: any existing output file that already contains a valid trip-planner
response is left alone. Files that are missing OR contain a stale bot-challenge stub are
(re)fetched.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = "https://www.etransport.al"
API_URL = f"{BASE_URL}/api/trips"
REQUEST_DELAY_SECONDS = 0.4
ABORT_AFTER_CONSECUTIVE_FAILURES = 10


def is_valid_response(text: str) -> bool:
    try:
        data = json.loads(text)
        if not isinstance(data, dict):
            return False
        payload = data.get("response", data)
        result = payload.get("result") if isinstance(payload, dict) else None
        plan = result.get("plan") if isinstance(result, dict) else None
        return isinstance(plan, dict) and isinstance(plan.get("itineraries", []), list)
    except (json.JSONDecodeError, TypeError):
        return False


async def fetch_day(context, day: str, failure_counter: list[int]) -> None:
    manifest_path = Path(f"data/manifest_{day}.jsonl")
    lines = manifest_path.read_text(encoding="utf-8").splitlines()
    total = len(lines)
    count = 0
    refetched = 0

    for line in lines:
        entry = json.loads(line)
        out_path = Path(entry["out"])
        count += 1

        if out_path.exists() and is_valid_response(out_path.read_text(encoding="utf-8")):
            continue

        payload = json.loads(Path(entry["payload"]).read_text(encoding="utf-8"))
        response = await context.request.post(
            API_URL,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
        )
        body = await response.text()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(body, encoding="utf-8")
        refetched += 1

        if response.ok and is_valid_response(body):
            failure_counter[0] = 0
        else:
            failure_counter[0] += 1
            if failure_counter[0] >= ABORT_AFTER_CONSECUTIVE_FAILURES:
                print(
                    f"[{day}] ABORTING: {failure_counter[0]} consecutive invalid "
                    "planner responses -- still being blocked. Stopping instead of "
                    "grinding through the rest.",
                    flush=True,
                )
                return

        if count % 50 == 0:
            print(f"[{day}] progress: {count}/{total} (refetched {refetched})", flush=True)
        await asyncio.sleep(REQUEST_DELAY_SECONDS)

    print(f"[{day}] ALL DONE: {count}/{total} (refetched {refetched})", flush=True)


async def main(days: list[str]) -> None:
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(
            locale="sq-AL",
            timezone_id="Europe/Tirane",
            viewport={"width": 1440, "height": 1100},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/150.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()
        print("Establishing session (loading homepage)...", flush=True)
        await page.goto(BASE_URL, wait_until="networkidle", timeout=60000)
        await asyncio.sleep(2)
        await page.close()

        failure_counter = [0]
        for day in days:
            await fetch_day(context, day, failure_counter)
            if failure_counter[0] >= ABORT_AFTER_CONSECUTIVE_FAILURES:
                break

        await context.close()
        await browser.close()
    print("WEEK BATCH DONE:", " ".join(days), flush=True)


if __name__ == "__main__":
    days_arg = sys.argv[1:] or ["tue", "wed", "thu", "fri", "sat", "sun"]
    asyncio.run(main(days_arg))
