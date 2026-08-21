import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { stations } from "../schema";
import { isForeignKeyViolation, isUniqueViolation } from "./db-errors";

// Scraped stations use positive source IDs. Admin-created ones get a
// negative, monotonically decreasing ID so they never collide, while
// staying well within Postgres's 32-bit integer range (unlike a raw
// millisecond timestamp, which overflows it).
export async function nextSyntheticSourceId(): Promise<number> {
  const [row] = await db.select({ min: sql<number | null>`min(${stations.sourceId})` }).from(stations);
  const current = row?.min ?? 0;
  return current > 0 ? -1 : current - 1;
}

export type AdminMutationResult = { ok: true } | { ok: false; error: string };

export interface StationInput {
  name: string;
  code: string;
  city: string;
  address: string | null;
  latitude: string;
  longitude: string;
  description: string | null;
  category: "terminus" | "intermediate";
  photoUrls: string[];
}

export async function listStationsForAdmin() {
  return db.select().from(stations).orderBy(stations.city, stations.name);
}

export async function getStationForAdmin(id: number) {
  const [row] = await db.select().from(stations).where(eq(stations.id, id)).limit(1);
  return row ?? null;
}

export async function createStationForAdmin(
  input: StationInput
): Promise<{ ok: true; stationId: number } | { ok: false; error: string }> {
  try {
    const [created] = await db
      .insert(stations)
      .values({ ...input, sourceId: await nextSyntheticSourceId() })
      .returning({ id: stations.id });
    return { ok: true, stationId: created.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That station name or code is already in use." };
    throw error;
  }
}

export async function updateStationForAdmin(id: number, input: StationInput): Promise<AdminMutationResult> {
  try {
    await db.update(stations).set(input).where(eq(stations.id, id));
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That station name or code is already in use." };
    throw error;
  }
}

export async function deleteStationForAdmin(id: number): Promise<AdminMutationResult> {
  try {
    await db.delete(stations).where(eq(stations.id, id));
    return { ok: true };
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      return { ok: false, error: "This station is used by scheduled departures and can't be deleted." };
    }
    throw error;
  }
}
