import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Next.js already loads .env.local itself; this only matters for standalone
    // scripts (tsx) run outside Next.js, and is a no-op if the file is absent.
  }
}

// Neon's serverless compute suspends after inactivity and can transiently fail
// the first request while it wakes back up. Retry a couple of times before
// surfacing an error, since a single blip shouldn't crash the whole page.
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(input, init);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }
  throw new Error("unreachable");
};

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
