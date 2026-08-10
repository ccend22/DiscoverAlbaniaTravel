import { writeFileSync } from "fs";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

/**
 * Exports every distinct (from city, to city) pair actually served by a
 * trip_departure, so the Gjirafa scraper knows exactly which routes to look
 * up instead of guessing from the full station list. Feeds scrape_gjirafa_prices.py.
 */
async function main() {
  const { rows } = await db.execute<{ from_city: string; to_city: string; trip_count: number }>(sql`
    select fs.city as from_city, ts.city as to_city, count(*)::int as trip_count
    from trip_departures td
    join stations fs on fs.id = td.from_station_id
    join stations ts on ts.id = td.to_station_id
    where fs.city <> ts.city
    group by fs.city, ts.city
    order by trip_count desc
  `);

  const pairs = rows.map((r) => ({
    fromCity: r.from_city,
    toCity: r.to_city,
    tripCount: r.trip_count,
  }));

  writeFileSync("data/city_pairs.json", JSON.stringify(pairs, null, 2) + "\n");
  console.log(`Wrote ${pairs.length} city pairs to data/city_pairs.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
