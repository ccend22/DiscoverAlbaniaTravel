import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "../session-secret";

// 15 minutes -- deliberately short since a leaked access token (e.g. logged
// somewhere, cached by a proxy) is only useful for a brief window; the
// refresh token is the long-lived, revocable credential (see refresh-token.ts).
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface MobileAccessTokenPayload {
  vendorUserId: number;
  deviceId: number;
  operatorId: number;
  isOwner: boolean;
  permissions: string[];
  capabilities: { sellingEnabled: boolean; fiscalPrintingEnabled: boolean };
}

function getSecret(): string {
  return getSessionSecret("MOBILE_ACCESS_TOKEN_SECRET", "dev-mobile-access-token-secret");
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

// Same hand-rolled HMAC scheme as vendor-session.ts/admin-session.ts (no JWT
// library dependency) -- just delivered as a bearer string in an
// Authorization header instead of an httpOnly cookie, since a native app has
// no cookie jar shared with a browser.
export function issueMobileAccessToken(payload: MobileAccessTokenPayload): {
  token: string;
  expiresAt: number;
} {
  const expiresAt = Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
  const encoded = Buffer.from(JSON.stringify({ ...payload, expiresAt })).toString("base64url");
  return { token: `${encoded}.${sign(encoded)}`, expiresAt };
}

export function verifyMobileAccessToken(token: string): MobileAccessTokenPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = sign(encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as MobileAccessTokenPayload & {
      expiresAt?: unknown;
    };
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt < Date.now()) return null;
    if (typeof parsed.vendorUserId !== "number" || typeof parsed.deviceId !== "number") return null;
    const { expiresAt: _expiresAt, ...payload } = parsed;
    return payload;
  } catch {
    return null;
  }
}
