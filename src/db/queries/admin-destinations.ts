import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { destinations } from "../schema";
import { isUniqueViolation } from "./db-errors";

// See admin-stations.ts: negative, monotonically decreasing synthetic IDs
// avoid colliding with scraped (positive) source IDs without overflowing
// Postgres's 32-bit integer column.
async function nextSyntheticSourceId(): Promise<number> {
  const [row] = await db.select({ min: sql<number | null>`min(${destinations.sourceId})` }).from(destinations);
  const current = row?.min ?? 0;
  return current > 0 ? -1 : current - 1;
}

export type AdminMutationResult = { ok: true } | { ok: false; error: string };

export interface DestinationInput {
  name: string;
  description: string;
}

export async function listDestinationsForAdmin() {
  return db.select().from(destinations).orderBy(destinations.name);
}

export async function getDestinationForAdmin(id: number) {
  const [row] = await db.select().from(destinations).where(eq(destinations.id, id)).limit(1);
  return row ?? null;
}

export async function createDestinationForAdmin(
  input: DestinationInput
): Promise<{ ok: true; destinationId: number } | { ok: false; error: string }> {
  try {
    const [created] = await db
      .insert(destinations)
      .values({ ...input, sourceId: await nextSyntheticSourceId() })
      .returning({ id: destinations.id });
    return { ok: true, destinationId: created.id };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "A destination with that name already exists." };
    throw error;
  }
}

export async function updateDestinationForAdmin(
  id: number,
  input: DestinationInput
): Promise<AdminMutationResult> {
  try {
    await db.update(destinations).set(input).where(eq(destinations.id, id));
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "A destination with that name already exists." };
    throw error;
  }
}

export async function deleteDestinationForAdmin(id: number): Promise<AdminMutationResult> {
  await db.delete(destinations).where(eq(destinations.id, id));
  return { ok: true };
}
