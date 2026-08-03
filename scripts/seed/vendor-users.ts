import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../src/db";
import { operators, vendorUsers } from "../../src/db/schema";
import { hashPassword } from "../../src/lib/password";

function vendorEmailForOperator(id: number, sourceId: number | null) {
  const operatorKey = sourceId === null ? `db-${id}` : String(sourceId);
  return `vendor+operator-${operatorKey}@discover-albania.local`;
}

export async function seedVendorUsers(): Promise<number> {
  const rows = await db
    .select({
      id: operators.id,
      sourceId: operators.sourceId,
      name: operators.name,
    })
    .from(operators);

  let count = 0;

  for (const operator of rows) {
    const [existing] = await db
      .select({ id: vendorUsers.id })
      .from(vendorUsers)
      .where(eq(vendorUsers.operatorId, operator.id))
      .limit(1);

    if (existing) continue;

    await db.insert(vendorUsers).values({
      operatorId: operator.id,
      email: vendorEmailForOperator(operator.id, operator.sourceId),
      passwordHash: hashPassword(randomBytes(32).toString("base64url")),
      name: `${operator.name} vendor`,
      status: "approved",
    });
    count++;
  }

  console.log(`vendor_users: seeded ${count}`);
  if (count > 0) {
    console.log("vendor_users: set each operator's email and password from Admin > Vendors");
  }
  return count;
}
