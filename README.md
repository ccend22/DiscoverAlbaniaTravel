# Discover Albania Travel

This repository contains the Next.js web application, Neon/Postgres database schema and seed tools,
plus the eTransport public-data scraper used to build the bus timetable dataset.

## Run the web app

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Development uses webpack to keep CPU and cache growth more predictable
on laptops. If port 3000 is occupied, Next.js prints the alternate local URL.

## Set up Neon

Create `.env.local` from `.env.example`, add the Neon `DATABASE_URL`, and generate independent session
secrets with `openssl rand -base64 48`. Never commit `.env.local`.

Run these commands from this project folder, in order:

```bash
npm run db:migrate
npm run db:seed
npm run db:seed-admin
npm run db:health
```

`db:seed` creates a locked vendor account for every bus operator that does not have one. An admin assigns each
operator's real email and a unique password from **Admin > Vendors > All vendor accounts**. There is
no public vendor signup. The private entry points are `/admin/login` and `/vendor/login`.

Use `/taxi` for traveler taxi requests. The taxi-provider vendor portal is intentionally disabled for
now; taxi requests are managed by platform admins.

## Refresh weekly bus data

The browser-based fetcher processes days sequentially and validates the actual planner response shape
so WAF challenge pages and JSON error objects are not mistaken for successful data.

```bash
./run_fetch_week.sh tue wed thu fri sat sun
python3 build_itineraries.py
npm run db:seed
npm run db:health
```

## eTransport scraper

This project opens `https://www.etransport.al/` in Chromium, captures the public JSON/API responses used by the website, crawls the public operator/agency/route/contact pages, and exports:

- `etransport_data.xlsx`
- CSV files for operators, agencies, stations, routes/schedules, prices and contacts
- raw JSON responses
- page text/HTML/screenshots
- discovered API-like endpoint strings from JavaScript bundles

It does **not** log in, bypass authentication, solve CAPTCHAs, or access private dashboards.

## Run on macOS

1. Unzip the folder.
2. Double-click `run_scraper.command`.
3. macOS may ask for permission to open it. Choose **Open**.
4. The output will be created in `etransport_output/`.

Terminal alternative:

```bash
cd etransport_scraper
chmod +x run_scraper.command
./run_scraper.command
```

## Faster headless run

```bash
source .venv/bin/activate
python scrape_etransport.py --output etransport_output
```

## Notes

- Keep request volume low. The default is at most 40 public pages.
- The website is dynamic; if some categories are empty, rerun with the visible browser and manually accept any cookie banner while the script works.
- Prices may be tied to specific route/date searches. The scraper captures any price/fare values returned by the public pages and APIs during the crawl.
