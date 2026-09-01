import { randomBytes, createHash } from "node:crypto";

// 60 days -- long-lived by design (a driver shouldn't have to re-enter their
// password every 15 minutes), but fully revocable per (device, vendorUser)
// pair via device_refresh_tokens.revokedAt, unlike the access token which
// simply expires.
export const REFRESH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

// Opaque bearer secret, not a signed/structured token -- same treatment as
// bookings.ticketToken/manageToken: random bytes, looked up by hash, never
// decoded. Only the hash is ever persisted (see hashRefreshToken), so a
// database read alone can't reconstruct a usable token.
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
