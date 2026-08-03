import { sql } from "drizzle-orm";
import { db } from "../../src/db";
import { seedOperators } from "./operators";
import { seedStations } from "./stations";
import { seedRoutes } from "./routes";
import { seedTripDepartures } from "./trip-departures";
import { seedDestinations } from "./destinations";
import { seedBlogPosts } from "./blog-posts";
import { seedVendorUsers } from "./vendor-users";

async function main() {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent`);
  const vatToOperatorId = await seedOperators();
  const stationNameToId = await seedStations();
  const routeCodeToId = await seedRoutes(vatToOperatorId);
  await seedTripDepartures(routeCodeToId, stationNameToId);
  await seedVendorUsers();
  await seedDestinations();
  await seedBlogPosts();
  console.log("seed complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
