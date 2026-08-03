import { eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema";
import { hashPassword, verifyPassword } from "@/lib/password";

export type CreateUserResult = { ok: true; userId: number } | { ok: false; error: "email_taken" };

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  phone: string | null;
}): Promise<CreateUserResult> {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) return { ok: false, error: "email_taken" };

  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash: hashPassword(input.password),
      phone: input.phone,
    })
    .returning({ id: users.id });

  return { ok: true, userId: created.id };
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<{ id: number } | null> {
  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, status: users.status })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) return null;
  return { id: user.id };
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export async function getUserById(userId: number): Promise<UserProfile | null> {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, phone: users.phone })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function isUserActive(userId: number): Promise<boolean> {
  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.status === "active";
}

export async function updateUserProfile(
  userId: number,
  input: { name: string; phone: string | null }
): Promise<void> {
  await db
    .update(users)
    .set({ name: input.name, phone: input.phone, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
