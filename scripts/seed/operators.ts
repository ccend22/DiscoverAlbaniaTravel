import { db } from "../../src/db";
import { operators } from "../../src/db/schema";
import { readCsv } from "./csv";

interface CompanyRow {
  id: string;
  name: string;
  vat: string;
  phone: string;
  email: string;
  street: string;
  city: string;
  rating: string;
  rating_count: string;
}

interface ItineraryRow {
  agency_name: string;
  agency_id_vat: string;
}

export async function seedOperators(): Promise<Map<string, number>> {
  const companies = readCsv<CompanyRow>("data/companies_table.csv");
  const companiesByVat = new Map<string, CompanyRow>();
  for (const row of companies) {
    if (!row.vat.trim()) continue;
    const existing = companiesByVat.get(row.vat);
    if (!existing || (!existing.city.trim() && row.city.trim())) {
      companiesByVat.set(row.vat, row);
    }
  }

  const itineraries = readCsv<ItineraryRow>("data/itineraries.csv");
  const vatToName = new Map<string, string>();
  for (const row of itineraries) {
    if (!vatToName.has(row.agency_id_vat)) {
      vatToName.set(row.agency_id_vat, row.agency_name);
    }
  }

  const vatToOperatorId = new Map<string, number>();
  for (const [vat, name] of vatToName) {
    const company = companiesByVat.get(vat);
    if (!company) {
      throw new Error(`No companies_table.csv row found for vat ${vat} (agency_name ${name})`);
    }
    const [inserted] = await db
      .insert(operators)
      .values({
        sourceId: Number(company.id),
        vat,
        name,
        phone: company.phone || null,
        email: company.email || null,
        street: company.street || null,
        city: company.city || null,
        rating: company.rating || "0",
        ratingCount: Number(company.rating_count),
      })
      .onConflictDoUpdate({
        target: operators.vat,
        set: {
          name,
          phone: company.phone || null,
          email: company.email || null,
          street: company.street || null,
          city: company.city || null,
          rating: company.rating || "0",
          ratingCount: Number(company.rating_count),
        },
      })
      .returning({ id: operators.id });
    vatToOperatorId.set(vat, inserted.id);
  }

  console.log(`operators: seeded ${vatToOperatorId.size}`);
  return vatToOperatorId;
}
