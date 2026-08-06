import { eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { destinations } from "../schema";

export async function listDestinations() {
  return db.select().from(destinations).orderBy(destinations.name);
}

export async function getDestinationById(id: number) {
  const [row] = await db.select().from(destinations).where(eq(destinations.id, id)).limit(1);
  return row ?? null;
}

export async function getDestinationsByNames(names: string[]) {
  return db
    .select({ id: destinations.id, name: destinations.name, description: destinations.description })
    .from(destinations)
    .where(inArray(destinations.name, names));
}
