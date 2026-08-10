"""
Scrapes bus ticket prices for Albanian city-pair routes from travel.gjirafa.com,
a real booking platform that lists live fares (ours don't have real prices —
they come from etransport.al / dpshtrr.al, Albania's transport registry, which
tracks schedules but not fares).

Each route gets a dedicated SEO page at travel.gjirafa.com/en/bus/{from}-to-{to}
that embeds a schema.org Product/AggregateOffer JSON-LD block with a lowPrice in
EUR when the route is a real product on the site. Pages for routes Gjirafa
doesn't serve return 200 with a different template and no Product block, which
is how "no price available" is distinguished from a real result — there's no
usable search API, so this scrapes the rendered pages directly.

Input:  data/city_pairs.json          (written by scripts/export-city-pairs.ts)
Output: data/gjirafa_prices.json      (consumed by scripts/backfill-prices.ts)
Cache:  data/gjirafa_slug_cache.json  (resolved city -> gjirafa URL slug, reused across runs)

Usage:
  python3 scrape_gjirafa_prices.py              # resume, skipping pairs already scraped
  python3 scrape_gjirafa_prices.py --force      # re-scrape everything, ignore caches
  python3 scrape_gjirafa_prices.py --limit=20   # only process the first N pairs (testing)
"""
from __future__ import annotations

import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timezone

BASE = "https://travel.gjirafa.com/en/bus"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept-Language": "en",
}
REQUEST_DELAY_SECONDS = 0.4
MAX_RETRIES = 3

CITY_PAIRS_FILE = "data/city_pairs.json"
OUTPUT_FILE = "data/gjirafa_prices.json"
SLUG_CACHE_FILE = "data/gjirafa_slug_cache.json"


def strip_diacritics(s: str) -> str:
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


def base_slug(name: str) -> str:
    s = strip_diacritics(name).lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    return re.sub(r"\s+", "-", s.strip())


def slug_candidates(name: str) -> list[str]:
    """Albanian place names ending in an unstressed -ë are often anglicized with a
    final -a instead of a plain diacritic strip (Tiranë -> tirana, not tirane;
    Vlorë -> vlora; Sarandë -> saranda). Try both; resolve_and_fetch() figures out
    which one is real by probing the site."""
    b = base_slug(name)
    candidates = [b]
    if b.endswith("e") and len(b) > 1:
        candidates.append(b[:-1] + "a")
    return candidates


def fetch(url: str) -> str | None:
    req = urllib.request.Request(url, headers=HEADERS)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if attempt == MAX_RETRIES:
                print(f"  ! HTTP {e.code} on {url}, giving up", file=sys.stderr)
                return None
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == MAX_RETRIES:
                print(f"  ! {e} on {url}, giving up", file=sys.stderr)
                return None
        time.sleep(attempt * 1.5)
    return None


def extract_offer(html: str) -> tuple[float, str, int | None] | None:
    """Pulls (lowPrice, currency, offerCount) out of the page's Product JSON-LD
    block. Returns None when the page has no Product offer (route not sold here)."""
    for match in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL):
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if data.get("@type") == "Product" and "offers" in data:
            offers = data["offers"]
            try:
                return float(offers["lowPrice"]), offers.get("priceCurrency", "EUR"), offers.get("offerCount")
            except (KeyError, ValueError, TypeError):
                continue
    return None


def try_pair(from_slug: str, to_slug: str) -> dict | None:
    url = f"{BASE}/{from_slug}-to-{to_slug}"
    html = fetch(url)
    time.sleep(REQUEST_DELAY_SECONDS)
    if not html:
        return None
    offer = extract_offer(html)
    if not offer:
        return None
    price, currency, offer_count = offer
    return {"url": url, "price": price, "currency": currency, "offerCount": offer_count}


def resolve_and_fetch(from_city: str, to_city: str, slug_cache: dict[str, str]) -> dict | None:
    """Tries every candidate slug combination for (from_city, to_city), preferring
    slugs already confirmed by an earlier pair. Falls back to the reverse-direction
    page when the direct one doesn't exist — bus fares are the same both ways, and
    Gjirafa doesn't always publish both directions of a pair."""
    from_cands = [slug_cache[from_city]] if from_city in slug_cache else slug_candidates(from_city)
    to_cands = [slug_cache[to_city]] if to_city in slug_cache else slug_candidates(to_city)

    for f in from_cands:
        for t in to_cands:
            result = try_pair(f, t)
            if result:
                slug_cache[from_city] = f
                slug_cache[to_city] = t
                return {**result, "direction": "direct"}

    for t in to_cands:
        for f in from_cands:
            result = try_pair(t, f)
            if result:
                slug_cache[from_city] = f
                slug_cache[to_city] = t
                return {**result, "direction": "reverse"}

    return None


def load_json(path: str, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def save_json(path: str, data) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")


def main() -> None:
    force = "--force" in sys.argv
    limit = None
    for arg in sys.argv[1:]:
        if arg.startswith("--limit="):
            limit = int(arg.split("=", 1)[1])

    pairs = load_json(CITY_PAIRS_FILE, None)
    if pairs is None:
        print(f"{CITY_PAIRS_FILE} not found — run `npx tsx scripts/export-city-pairs.ts` first.", file=sys.stderr)
        sys.exit(1)
    if limit:
        pairs = pairs[:limit]

    slug_cache: dict[str, str] = {} if force else load_json(SLUG_CACHE_FILE, {})

    existing_by_key: dict[tuple[str, str], dict] = {}
    if not force:
        for row in load_json(OUTPUT_FILE, []):
            existing_by_key[(row["fromCity"], row["toCity"])] = row

    results = []
    matched = 0
    for i, pair in enumerate(pairs, 1):
        from_city, to_city, trip_count = pair["fromCity"], pair["toCity"], pair["tripCount"]
        key = (from_city, to_city)

        if key in existing_by_key:
            row = existing_by_key[key]
            results.append(row)
            if row["matched"]:
                matched += 1
            continue

        print(f"[{i}/{len(pairs)}] {from_city} -> {to_city} ({trip_count} departures)...", end=" ", flush=True)
        found = resolve_and_fetch(from_city, to_city, slug_cache)

        if found:
            matched += 1
            print(f"OK  {found['price']} {found['currency']}  ({found['direction']}, {found['url']})")
            results.append(
                {
                    "fromCity": from_city,
                    "toCity": to_city,
                    "tripCount": trip_count,
                    "matched": True,
                    "priceEur": found["price"] if found["currency"] == "EUR" else None,
                    "currency": found["currency"],
                    "offerCount": found.get("offerCount"),
                    "sourceUrl": found["url"],
                    "direction": found["direction"],
                    "scrapedAt": datetime.now(timezone.utc).isoformat(),
                }
            )
        else:
            print("no price found")
            results.append(
                {
                    "fromCity": from_city,
                    "toCity": to_city,
                    "tripCount": trip_count,
                    "matched": False,
                    "priceEur": None,
                    "currency": None,
                    "offerCount": None,
                    "sourceUrl": None,
                    "direction": None,
                    "scrapedAt": datetime.now(timezone.utc).isoformat(),
                }
            )

        # Persist after every pair so a crash or Ctrl-C doesn't lose progress.
        save_json(OUTPUT_FILE, results)
        save_json(SLUG_CACHE_FILE, dict(sorted(slug_cache.items())))

    total_trips = sum(p["tripCount"] for p in pairs)
    matched_trips = sum(r["tripCount"] for r in results if r["matched"])
    print(
        f"\nDone. Matched {matched}/{len(pairs)} city pairs "
        f"({matched_trips}/{total_trips} trip_departures covered)."
    )
    print(f"Wrote {OUTPUT_FILE} and {SLUG_CACHE_FILE}")


if __name__ == "__main__":
    main()
