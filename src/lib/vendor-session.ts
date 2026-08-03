import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionSecret } from "./session-secret";

const COOKIE_NAME = "discover_albania_vendor";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function getSecret(): string {
  return getSessionSecret("VENDOR_SESSION_SECRET", "dev-vendor-secret");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function encodeSession(vendorUserId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ vendorUserId, expiresAt: Date.now() + MAX_AGE_SECONDS * 1000 })
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
      vendorUserId?: unknown;
      expiresAt?: unknown;
    };
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null;
    if (typeof parsed.vendorUserId !== "number") return null;
    return parsed.vendorUserId;
  } catch {
    return null;
  }
}

export async function setVendorSession(vendorUserId: number) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(vendorUserId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function clearVendorSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getVendorSessionId(): Promise<number | null> {
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get(COOKIE_NAME)?.value);
}

export async function requireVendorSession(): Promise<number> {
  const vendorUserId = await getVendorSessionId();
  if (!vendorUserId) redirect("/vendor/login");
  const { isApprovedVendorUser } = await import("@/db/queries/vendors");
  if (!(await isApprovedVendorUser(vendorUserId))) {
    redirect("/vendor/login?error=This%20vendor%20account%20is%20not%20active");
  }
  return vendorUserId;
}
