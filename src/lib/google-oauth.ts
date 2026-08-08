import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";

// Bounds how long we wait on Google before giving up, so a stalled network
// leaves the user with an error redirect instead of a hung request.
const FETCH_TIMEOUT_MS = 10_000;

export const GOOGLE_OAUTH_CALLBACK_PATH = "/account/google/callback";
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";
export const GOOGLE_OAUTH_PKCE_COOKIE = "google_oauth_pkce";

export class GoogleOAuthConfigError extends Error {}

// Behind Cloud Run's proxy, `request.url` inside a standalone-mode Route
// Handler reflects the container's own bind address (HOSTNAME:PORT, e.g.
// 0.0.0.0:8080) rather than the public Host — so redirects must be built
// from SITE_URL, never from request.url/request.nextUrl.
export function getSiteOrigin(): string {
  const configuredSiteUrl = process.env.SITE_URL;
  if (!configuredSiteUrl) {
    if (process.env.NODE_ENV === "production") {
      // Falling back to localhost here would silently send every real user's
      // Google redirect to a URL that doesn't exist in production, and it
      // would never match the redirect URI registered in Google Cloud
      // Console anyway — so this must fail loudly instead of misdirecting.
      throw new GoogleOAuthConfigError("SITE_URL is required in production");
    }
  } else if (process.env.NODE_ENV === "production" && !configuredSiteUrl.startsWith("https://")) {
    // A plain-HTTP redirect would carry the authorization code back to us
    // over unencrypted transport, where it can be intercepted in transit.
    throw new GoogleOAuthConfigError("SITE_URL must use https in production");
  }
  return (configuredSiteUrl ?? "http://localhost:3000").replace(/\/+$/, "");
}

function getRedirectUri(): string {
  return `${getSiteOrigin()}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

// PKCE (RFC 7636): binds the authorization code to the request that started
// it, so a code intercepted or replayed elsewhere can't be redeemed without
// also having the verifier that only this server instance ever holds.
// Recommended for all OAuth clients, not just public ones — see the OAuth
// Security BCP (RFC 9700) on authorization code injection.
export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleOAuthConfigError("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not configured");
  }
  return { clientId, clientSecret };
}

export function buildGoogleAuthUrl(state: string, codeChallenge: string): string {
  const { clientId } = getClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeCodeForAccessToken(code: string, codeVerifier: string): Promise<string> {
  const { clientId, clientSecret } = getClientCredentials();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed with status ${response.status}`);
  }

  const data = (await response.json()) as GoogleTokenResponse;
  return data.access_token;
}

// Validated strictly (not just type-cast) because email_verified gates account
// creation/linking: a permissive `.parse` that coerced a stray "false" string
// to a truthy boolean would silently let an unverified email through.
const googleUserInfoSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean(),
  name: z.string().default(""),
});

export type GoogleUserInfo = z.infer<typeof googleUserInfoSchema>;

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Google userinfo request failed with status ${response.status}`);
  }

  return googleUserInfoSchema.parse(await response.json());
}
