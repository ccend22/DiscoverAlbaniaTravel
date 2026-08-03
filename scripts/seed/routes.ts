import { db } from "../../src/db";
import { routes } from "../../src/db/schema";
import { readCsv } from "./csv";

interface ItineraryRow {
  route_code: string;
  route_long_name: string;
  agency_id_vat: string;
}

export async function seedRoutes(vatToOperatorId: Map<string, number>): Promise<Map<string, number>> {
  const itineraries = readCsv<ItineraryRow>("data/itineraries.csv");

  const byCode = new Map<string, ItineraryRow>();
  for (const row of itineraries) {
    if (!byCode.has(row.route_code)) {
      byCode.set(row.route_code, row);
    }
  }

  const routeCodeToId = new Map<string, number>();
  for (const [code, row] of byCode) {
    const operatorId = vatToOperatorId.get(row.agency_id_vat);
    if (operatorId === undefined) {
      throw new Error(`No operator found for route ${code} (vat ${row.agency_id_vat})`);
    }
    const [inserted] = await db
      .insert(routes)
      .values({
        code,
        longName: row.route_long_name,
        operatorId,
      })
      .onConflictDoUpdate({
        target: routes.code,
        set: { longName: row.route_long_name, operatorId },
      })
      .returning({ id: routes.id });
    routeCodeToId.set(code, inserted.id);
  }

  console.log(`routes: seeded ${routeCodeToId.size}`);
  return routeCodeToId;
}
