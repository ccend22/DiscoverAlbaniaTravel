import { and, asc, eq, ne, sql } from "drizzle-orm";
import { db } from "../index";
import { adminUsers } from "../schema";
import { hashPassword } from "@/lib/password";
import { isUniqueViolation } from "./db-errors";

export type AdminMutationResult = { ok: true } | { ok: false; error: string };

export async function adminUserExists(id: number): Promise<boolean> {
  const [admin] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);
  return Boolean(admin);
}

export async function listAdminUsersForAdmin() {
  return db
    .select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, createdAt: adminUsers.createdAt })
    .from(adminUsers)
    .orderBy(asc(adminUsers.createdAt));
}

export async function createAdminUserForAdmin(input: {
  name: string;
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await db.insert(adminUsers).values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(input.password),
    });
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That email is already registered." };
    throw error;
  }
}

export async function updateAdminUserForAdmin(
  id: number,
  input: { name: string; email: string; password?: string }
): Promise<AdminMutationResult> {
  try {
    await db
      .update(adminUsers)
      .set({
        name: input.name,
        email: input.email.toLowerCase(),
        ...(input.password ? { passwordHash: hashPassword(input.password) } : {}),
      })
      .where(eq(adminUsers.id, id));
    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "That email is already registered." };
    throw error;
  }
}

export async function deleteAdminUserForAdmin(
  id: number,
  currentAdminId: number
): Promise<AdminMutationResult> {
  if (id === currentAdminId) {
    return { ok: false, error: "You can't remove your own admin account while signed in as it." };
  }
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(adminUsers);
  if (Number(count) <= 1) {
    return { ok: false, error: "At least one admin account must remain." };
  }
  await db.delete(adminUsers).where(and(eq(adminUsers.id, id), ne(adminUsers.id, currentAdminId)));
  return { ok: true };
}
