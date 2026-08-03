import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSecret } from "./session-secret";

const COOKIE_NAME = "discover_albania_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getSecret(): string {
  return getSessionSecret("ADMIN_SESSION_SECRET", "dev-admin-secret");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encodeSession(adminUserId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ adminUserId, expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string | undefined): number | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as {
      adminUserId?: unknown;
      expiresAt?: unknown;
    };
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null;
    if (typeof parsed.adminUserId !== "number") return null;
    return parsed.adminUserId;
  } catch {
    return null;
  }
}

export async function setAdminSession(adminUserId: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(adminUserId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getAdminSessionId(): Promise<number | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requireAdminSession(): Promise<number> {
  const adminUserId = await getAdminSessionId();
  if (!adminUserId) redirect("/admin/login");
  const { adminUserExists } = await import("@/db/queries/admin-accounts");
  if (!(await adminUserExists(adminUserId))) redirect("/admin/login");
  return adminUserId;
}
