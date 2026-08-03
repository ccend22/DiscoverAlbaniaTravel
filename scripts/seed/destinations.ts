import { db } from "../../src/db";
import { destinations } from "../../src/db/schema";
import { readCsv } from "./csv";

interface CityRow {
  id: string;
  name: string;
  description: string;
}

export async function seedDestinations(): Promise<number> {
  const rows = readCsv<CityRow>("data/cities_table.csv");

  for (const row of rows) {
    await db
      .insert(destinations)
      .values({
        sourceId: Number(row.id),
        name: row.name,
        description: row.description,
      })
      .onConflictDoUpdate({
        target: destinations.name,
        set: { description: row.description },
      });
  }

  console.log(`destinations: seeded ${rows.length}`);
  return rows.length;
}
