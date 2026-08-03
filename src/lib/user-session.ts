import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSecret } from "./session-secret";

const COOKIE_NAME = "discover_albania_user";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string {
  return getSessionSecret("USER_SESSION_SECRET", "dev-user-secret");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encodeSession(userId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 })
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
      userId?: unknown;
      expiresAt?: unknown;
    };
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null;
    if (typeof parsed.userId !== "number") return null;
    return parsed.userId;
  } catch {
    return null;
  }
}

export async function setUserSession(userId: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getUserSessionId(): Promise<number | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function getActiveUserSessionId(): Promise<number | null> {
  const userId = await getUserSessionId();
  if (!userId) return null;
  const { isUserActive } = await import("@/db/queries/users");
  return (await isUserActive(userId)) ? userId : null;
}

export async function requireUserSession(): Promise<number> {
  const userId = await getUserSessionId();
  if (!userId) redirect("/account/login");
  const { isUserActive } = await import("@/db/queries/users");
  if (!(await isUserActive(userId))) redirect("/account/login?error=This%20account%20is%20not%20active");
  return userId;
}
