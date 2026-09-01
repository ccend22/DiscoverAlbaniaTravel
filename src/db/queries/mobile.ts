import { and, desc, eq } from "drizzle-orm";
import { db } from "../index";
import { devices, deviceRefreshTokens, printJobs, mobileIdempotencyKeys } from "../schema";
import { getVendorContext } from "./vendors";
import { generateActivationCode, hashActivationCode, ACTIVATION_CODE_TTL_MS } from "@/lib/mobile/activation-code";
import { generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_MS } from "@/lib/mobile/refresh-token";

// --- Device activation ---
// A vendor owner generates a code (self-service, same trust boundary and
// same owner-only-checked-inside-the-query-function convention as
// createVendorTeamUser -- the page itself also gates on requireVendorOwner,
// this is defense in depth); the Android app exchanges it once via
// POST /api/mobile/v1/device/activate.

export type CreateDeviceActivationCodeResult =
  | { ok: true; deviceId: number; code: string; expiresAt: Date }
  | { ok: false; error: "not_authorized" };

export async function createDeviceActivationCode(
  vendorUserId: number,
  label: string
): Promise<CreateDeviceActivationCodeResult> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved" || !context.isOwner) {
    return { ok: false, error: "not_authorized" };
  }

  const code = generateActivationCode();
  const expiresAt = new Date(Date.now() + ACTIVATION_CODE_TTL_MS);
  const [device] = await db
    .insert(devices)
    .values({
      operatorId: context.operatorId,
      label,
      status: "pending",
      activationCodeHash: hashActivationCode(code),
      activationCodeExpiresAt: expiresAt,
    })
    .returning({ id: devices.id });
  return { ok: true, deviceId: device.id, code, expiresAt };
}

export type ActivateDeviceResult =
  | { ok: true; deviceId: number; operatorId: number }
  | { ok: false; error: "invalid_or_expired" };

export async function activateDevice(rawCode: string, deviceIdentifier: string): Promise<ActivateDeviceResult> {
  const codeHash = hashActivationCode(rawCode);
  const [device] = await db
    .select({
      id: devices.id,
      operatorId: devices.operatorId,
      status: devices.status,
      expiresAt: devices.activationCodeExpiresAt,
    })
    .from(devices)
    .where(eq(devices.activationCodeHash, codeHash))
    .limit(1);

  if (!device || device.status !== "pending" || !device.expiresAt || device.expiresAt < new Date()) {
    return { ok: false, error: "invalid_or_expired" };
  }

  // CAS guard (WHERE status='pending') -- same idempotent-update idiom as
  // validateTicketForVendor's check-in write, in case two activation
  // attempts race on the same code.
  const [activated] = await db
    .update(devices)
    .set({
      status: "active",
      activationCodeHash: null,
      activationCodeExpiresAt: null,
      deviceIdentifier,
      activatedAt: new Date(),
    })
    .where(and(eq(devices.id, device.id), eq(devices.status, "pending")))
    .returning({ id: devices.id });

  if (!activated) return { ok: false, error: "invalid_or_expired" };
  return { ok: true, deviceId: device.id, operatorId: device.operatorId };
}

export async function listOperatorDevices(vendorUserId: number) {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved" || !context.isOwner) return [];

  return db
    .select({
      id: devices.id,
      label: devices.label,
      status: devices.status,
      activatedAt: devices.activatedAt,
      lastSeenAt: devices.lastSeenAt,
      createdAt: devices.createdAt,
    })
    .from(devices)
    .where(eq(devices.operatorId, context.operatorId))
    .orderBy(desc(devices.createdAt));
}

export async function revokeDevice(vendorUserId: number, deviceId: number): Promise<boolean> {
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved" || !context.isOwner) return false;

  // Revoking the device row alone (rather than hunting down every refresh
  // token it ever issued) is sufficient: verifyRefreshToken below re-checks
  // the device's own status on every use, so this instantly kills every
  // session on the device without a second write.
  const [revoked] = await db
    .update(devices)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(devices.id, deviceId), eq(devices.operatorId, context.operatorId), eq(devices.status, "active")))
    .returning({ id: devices.id });
  return Boolean(revoked);
}

export async function getActiveDevice(deviceId: number) {
  const [device] = await db
    .select({ id: devices.id, operatorId: devices.operatorId, status: devices.status })
    .from(devices)
    .where(eq(devices.id, deviceId))
    .limit(1);
  if (!device || device.status !== "active") return null;
  return device;
}

export async function touchDeviceLastSeen(deviceId: number): Promise<void> {
  await db.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.id, deviceId));
}

// --- Refresh tokens ---

export async function issueRefreshToken(
  deviceId: number,
  vendorUserId: number
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  await db.insert(deviceRefreshTokens).values({ deviceId, vendorUserId, tokenHash: hashRefreshToken(token), expiresAt });
  return { token, expiresAt };
}

export type VerifyRefreshTokenResult =
  | { ok: true; deviceId: number; vendorUserId: number; tokenRowId: number }
  | { ok: false; error: "invalid" | "expired" | "revoked" | "device_revoked" };

export async function verifyRefreshToken(rawToken: string): Promise<VerifyRefreshTokenResult> {
  const tokenHash = hashRefreshToken(rawToken);
  const [row] = await db
    .select({
      id: deviceRefreshTokens.id,
      deviceId: deviceRefreshTokens.deviceId,
      vendorUserId: deviceRefreshTokens.vendorUserId,
      expiresAt: deviceRefreshTokens.expiresAt,
      revokedAt: deviceRefreshTokens.revokedAt,
      deviceStatus: devices.status,
    })
    .from(deviceRefreshTokens)
    .innerJoin(devices, eq(deviceRefreshTokens.deviceId, devices.id))
    .where(eq(deviceRefreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) return { ok: false, error: "invalid" };
  if (row.revokedAt) return { ok: false, error: "revoked" };
  if (row.expiresAt < new Date()) return { ok: false, error: "expired" };
  if (row.deviceStatus !== "active") return { ok: false, error: "device_revoked" };
  return { ok: true, deviceId: row.deviceId, vendorUserId: row.vendorUserId, tokenRowId: row.id };
}

// Rotate on every refresh (revoke the presented token, issue a fresh one) --
// limits a stolen refresh token to a single use before it stops working.
export async function rotateRefreshToken(
  oldTokenRowId: number,
  deviceId: number,
  vendorUserId: number
): Promise<{ token: string; expiresAt: Date }> {
  await db.update(deviceRefreshTokens).set({ revokedAt: new Date() }).where(eq(deviceRefreshTokens.id, oldTokenRowId));
  return issueRefreshToken(deviceId, vendorUserId);
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await db
    .update(deviceRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(deviceRefreshTokens.tokenHash, hashRefreshToken(rawToken)));
}

// --- Idempotency cache (see mobile_idempotency_keys in schema.ts) ---

export async function getCachedIdempotentResponse(key: string): Promise<{ status: number; body: unknown } | null> {
  const [row] = await db
    .select({ responseStatus: mobileIdempotencyKeys.responseStatus, responseBody: mobileIdempotencyKeys.responseBody })
    .from(mobileIdempotencyKeys)
    .where(eq(mobileIdempotencyKeys.key, key))
    .limit(1);
  if (!row) return null;
  return { status: row.responseStatus, body: row.responseBody };
}

export async function storeIdempotentResponse(
  key: string,
  vendorUserId: number,
  endpoint: string,
  status: number,
  body: Record<string, unknown>
): Promise<void> {
  await db
    .insert(mobileIdempotencyKeys)
    .values({ key, vendorUserId, endpoint, responseStatus: status, responseBody: body })
    .onConflictDoNothing({ target: mobileIdempotencyKeys.key });
}

// --- Print jobs ---

export async function createPrintJob(input: {
  deviceId: number;
  vendorUserId: number;
  bookingId: number | null;
  type: "ticket" | "receipt" | "reprint";
  isCopy: boolean;
  reprintReason: string | null;
  payload: Record<string, unknown>;
  clientIdempotencyKey?: string;
}) {
  const [job] = await db
    .insert(printJobs)
    .values({
      deviceId: input.deviceId,
      vendorUserId: input.vendorUserId,
      bookingId: input.bookingId,
      type: input.type,
      isCopy: input.isCopy,
      reprintReason: input.reprintReason,
      payload: input.payload,
      clientIdempotencyKey: input.clientIdempotencyKey,
    })
    .returning();
  return job;
}

export async function getPrintJobByIdempotencyKey(clientIdempotencyKey: string) {
  const [job] = await db
    .select()
    .from(printJobs)
    .where(eq(printJobs.clientIdempotencyKey, clientIdempotencyKey))
    .limit(1);
  return job ?? null;
}

export async function getPrintJob(id: number) {
  const [job] = await db.select().from(printJobs).where(eq(printJobs.id, id)).limit(1);
  return job ?? null;
}

export async function completePrintJob(id: number): Promise<boolean> {
  const [updated] = await db
    .update(printJobs)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(printJobs.id, id), eq(printJobs.status, "queued")))
    .returning({ id: printJobs.id });
  return Boolean(updated);
}

export async function failPrintJob(id: number, reason: string): Promise<boolean> {
  const [updated] = await db
    .update(printJobs)
    .set({ status: "failed", failedAt: new Date(), failureReason: reason })
    .where(and(eq(printJobs.id, id), eq(printJobs.status, "queued")))
    .returning({ id: printJobs.id });
  return Boolean(updated);
}
