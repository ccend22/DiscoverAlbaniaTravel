import { readFileSync } from "fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

/**
 * Applies data/gjirafa_prices.json (written by scrape_gjirafa_prices.py) to
 * trip_departures.base_price:
 *
 *  - City pairs Gjirafa has a real fare for get that fare, converted from EUR
 *    to ALL, applied to every departure on that pair.
 *  - Everything else that's still sitting on the "1" seed placeholder gets set
 *    to NULL instead — the app shows "no online payment available" for those
 *    rather than a fake price.
 *
 * Only ever touches rows still at the "1" placeholder, so a re-run never
 * clobbers a real price an admin or vendor has since entered by hand.
 *
 * Usage:
 *   npx tsx scripts/backfill-prices.ts              # apply
 *   npx tsx scripts/backfill-prices.ts --dry-run     # preview counts only
 *   npx tsx scripts/backfill-prices.ts --rate=105    # override EUR->ALL rate
 */

const PLACEHOLDER_PRICE = "1";
const PRICES_FILE = "data/gjirafa_prices.json";

// Approximate market rate at time of writing; there's no live online payment
// processing on this platform today (booking reserves a seat, fare is paid to
// the operator on boarding), so this only needs to be a reasonable estimate
// for display, not a settlement-grade FX rate. Override with --rate=N.
const DEFAULT_EUR_TO_ALL_RATE = 100;

interface ScrapedPriceRow {
  fromCity: string;
  toCity: string;
  tripCount: number;
  matched: boolean;
  priceEur: number | null;
  currency: string | null;
  offerCount: number | null;
  sourceUrl: string | null;
  direction: "direct" | "reverse" | null;
  scrapedAt: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const rateArg = args.find((a) => a.startsWith("--rate="));
  const rate = rateArg ? Number(rateArg.split("=")[1]) : DEFAULT_EUR_TO_ALL_RATE;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid --rate value: ${rateArg}`);
  }
  return { dryRun, rate };
}

async function assertBasePriceIsNullable() {
  const { rows } = await db.execute<{ is_nullable: string }>(sql`
    select is_nullable from information_schema.columns
    where table_name = 'trip_departures' and column_name = 'base_price'
  `);
  if (rows[0]?.is_nullable !== "YES") {
    throw new Error(
      "trip_departures.base_price is still NOT NULL in the database. " +
        "Run the schema migration (npm run db:generate && npm run db:migrate) before backfilling."
    );
  }
}

async function main() {
  const { dryRun, rate } = parseArgs();
  // Dry runs only ever SELECT, so they work fine against the pre-migration
  // schema too — useful for previewing impact before the migration is applied.
  if (!dryRun) await assertBasePriceIsNullable();

  const priceRows: ScrapedPriceRow[] = JSON.parse(readFileSync(PRICES_FILE, "utf-8"));
  const matchedRows = priceRows.filter(
    (row): row is ScrapedPriceRow & { priceEur: number } =>
      row.matched && typeof row.priceEur === "number"
  );

  console.log(
    `Loaded ${priceRows.length} scraped pairs (${matchedRows.length} with a usable EUR price). ` +
      `Using rate 1 EUR = ${rate} ALL.${dryRun ? " [dry run]" : ""}`
  );

  const pairMatchCondition = (fromCity: string, toCity: string) => sql`
    exists (
      select 1 from stations fs, stations ts
      where fs.id = td.from_station_id and ts.id = td.to_station_id
        and fs.city = ${fromCity} and ts.city = ${toCity}
    )
  `;

  let pricedCount = 0;
  let pricedTrips = 0;
  for (const row of matchedRows) {
    const priceAll = String(Math.round(row.priceEur * rate));
    const affected = dryRun
      ? (
          await db.execute<{ count: number }>(sql`
            select count(*)::int as count from trip_departures td
            where td.base_price = ${PLACEHOLDER_PRICE} and ${pairMatchCondition(row.fromCity, row.toCity)}
          `)
        ).rows[0].count
      : (
          await db.execute(sql`
            update trip_departures td
            set base_price = ${priceAll}
            where td.base_price = ${PLACEHOLDER_PRICE} and ${pairMatchCondition(row.fromCity, row.toCity)}
          `)
        ).rowCount;
    if (affected) {
      pricedCount++;
      pricedTrips += affected;
    }
  }

  const totalPlaceholders = (
    await db.execute<{ count: number }>(sql`
      select count(*)::int as count from trip_departures where base_price = ${PLACEHOLDER_PRICE}
    `)
  ).rows[0].count;

  if (dryRun) {
    // Nothing was actually written, so every placeholder row is still "1" — subtract
    // what the priced pass above would have claimed to get the true leftover count.
    console.log(`Would price ${pricedTrips} departures across ${pricedCount} city pairs.`);
    console.log(
      `Would null out ${totalPlaceholders - pricedTrips} remaining placeholder departures (no Gjirafa match).`
    );
  } else {
    const { rowCount: nulledCount } = await db.execute(sql`
      update trip_departures set base_price = null where base_price = ${PLACEHOLDER_PRICE}
    `);
    console.log(`Priced ${pricedTrips} departures across ${pricedCount} city pairs.`);
    console.log(`Nulled out ${nulledCount} remaining placeholder departures (no Gjirafa match).`);
  }

  const unmatchedWithTraffic = priceRows
    .filter((row) => !row.matched)
    .sort((a, b) => b.tripCount - a.tripCount)
    .slice(0, 15);
  if (unmatchedWithTraffic.length > 0) {
    console.log("\nTop unmatched pairs (by departure count), for reference:");
    for (const row of unmatchedWithTraffic) {
      console.log(`  ${row.fromCity} -> ${row.toCity} (${row.tripCount} departures)`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
