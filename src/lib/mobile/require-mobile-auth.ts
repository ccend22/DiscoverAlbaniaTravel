import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifyMobileAccessToken, type MobileAccessTokenPayload } from "./access-token";

export type MobileAuthResult =
  | { ok: true; auth: MobileAccessTokenPayload }
  | { ok: false; response: NextResponse };

export function mobileErrorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

// The access token is self-contained (HMAC-signed, short TTL) and verified
// without a DB round trip -- see access-token.ts. A device/staff revocation
// takes effect the next time the app refreshes (at most every 15 minutes),
// which is the intentional tradeoff for not hitting the database on every
// single scan/request.
export function requireMobileAuth(request: NextRequest): MobileAuthResult {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    return { ok: false, response: mobileErrorResponse(401, "missing_bearer_token", "Authorization header is required.") };
  }
  const auth = verifyMobileAccessToken(header.slice("Bearer ".length));
  if (!auth) {
    return { ok: false, response: mobileErrorResponse(401, "invalid_or_expired_token", "Access token is invalid or expired.") };
  }
  return { ok: true, auth };
}
