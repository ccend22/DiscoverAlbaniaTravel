import { db } from "../../src/db";
import { stations } from "../../src/db/schema";
import { readCsv } from "./csv";

interface StationRow {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
}

export async function seedStations(): Promise<Map<string, number>> {
  const rows = readCsv<StationRow>("data/stations_table.csv");

  const stationNameToId = new Map<string, number>();
  for (const row of rows) {
    const [inserted] = await db
      .insert(stations)
      .values({
        sourceId: Number(row.id),
        name: row.name,
        code: row.code,
        city: row.city,
        address: row.address || null,
        latitude: row.latitude,
        longitude: row.longitude,
      })
      .onConflictDoUpdate({
        target: stations.code,
        set: {
          name: row.name,
          city: row.city,
          address: row.address || null,
          latitude: row.latitude,
          longitude: row.longitude,
        },
      })
      .returning({ id: stations.id });
    stationNameToId.set(row.name, inserted.id);
  }

  console.log(`stations: seeded ${stationNameToId.size}`);
  return stationNameToId;
}
