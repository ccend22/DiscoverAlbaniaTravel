import { db } from "../src/db";
import { adminUsers } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL?.toLowerCase() ?? "admin@discover-albania.local";
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME ?? "Platform Admin";
  if (!password) throw new Error("ADMIN_SEED_PASSWORD is required");

  const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing) {
    await db
      .update(adminUsers)
      .set({ name, passwordHash: hashPassword(password) })
      .where(eq(adminUsers.id, existing.id));
    console.log("admin credentials updated:", email);
    return;
  }

  await db.insert(adminUsers).values({
    email,
    passwordHash: hashPassword(password),
    name,
  });
  console.log("admin created:", email);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
