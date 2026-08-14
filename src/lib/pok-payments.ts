import { z } from "zod";

// Bounds how long we wait on POK before giving up, so a stalled network
// leaves the caller with a clear error instead of a hung request.
const FETCH_TIMEOUT_MS = 15_000;

// Refresh the cached bearer token this long before its real expiry, so a
// request that starts a multi-call flow (create order, then immediately
// verify it) doesn't get a mid-flight 401 from POK.
const TOKEN_REFRESH_SAFETY_MARGIN_MS = 60_000;

export class PokConfigError extends Error {}

function getBaseUrl(): string {
  return process.env.POK_ENV === "production" ? "https://api.pokpay.io" : "https://api-staging.pokpay.io";
}

function getCredentials(): { keyId: string; keySecret: string; merchantId: string } {
  const keyId = process.env.POK_KEY_ID;
  const keySecret = process.env.POK_KEY_SECRET;
  const merchantId = process.env.POK_MERCHANT_ID;
  if (!keyId || !keySecret || !merchantId) {
    throw new PokConfigError("POK_KEY_ID / POK_KEY_SECRET / POK_MERCHANT_ID are not configured");
  }
  return { keyId, keySecret, merchantId };
}

const pokLoginResponseSchema = z.object({
  data: z.object({
    accessToken: z.string().min(1),
    expiresAt: z.string(),
  }),
});

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

// Module-level, promise-cached so concurrent requests that all see a
// missing/expired token at once de-dupe into a single /auth/sdk/login call
// instead of a thundering herd. Only lives for this server instance's
// lifetime (lost on cold start) -- harmless here since there's nothing
// shared to invalidate and this is a low-QPS booking flow, not a hot path.
let cachedTokenPromise: Promise<CachedToken> | null = null;

async function login(): Promise<CachedToken> {
  const { keyId, keySecret } = getCredentials();
  const response = await fetch(`${getBaseUrl()}/auth/sdk/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyId, keySecret }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`POK login failed with status ${response.status}`);
  }

  const body = pokLoginResponseSchema.parse(await response.json());
  return { accessToken: body.data.accessToken, expiresAt: new Date(body.data.expiresAt).getTime() };
}

async function getAccessToken(): Promise<string> {
  const cached = cachedTokenPromise ? await cachedTokenPromise : null;
  if (cached && cached.expiresAt - TOKEN_REFRESH_SAFETY_MARGIN_MS > Date.now()) {
    return cached.accessToken;
  }

  cachedTokenPromise = login();
  try {
    return (await cachedTokenPromise).accessToken;
  } catch (error) {
    cachedTokenPromise = null; // don't cache a rejected login attempt
    throw error;
  }
}

const pokOrderSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currencyCode: z.string(),
  finalAmount: z.number(),
  isCompleted: z.boolean(),
  isRefunded: z.boolean().optional(),
  isCanceled: z.boolean().optional(),
  expiresAt: z.string().nullable().optional(),
  transactionId: z.string().nullable().optional(),
  _self: z.object({ confirmUrl: z.string() }),
});

const pokOrderResponseSchema = z.object({ data: z.object({ sdkOrder: pokOrderSchema }) });

export interface PokSdkOrder {
  id: string;
  amount: number;
  currencyCode: string;
  finalAmount: number;
  isCompleted: boolean;
  isRefunded: boolean;
  isCanceled: boolean;
  expiresAt: string | null;
  transactionId: string | null;
  confirmUrl: string;
}

function normalizeOrder(raw: z.infer<typeof pokOrderSchema>): PokSdkOrder {
  return {
    id: raw.id,
    amount: raw.amount,
    currencyCode: raw.currencyCode,
    finalAmount: raw.finalAmount,
    isCompleted: raw.isCompleted,
    isRefunded: raw.isRefunded ?? false,
    isCanceled: raw.isCanceled ?? false,
    expiresAt: raw.expiresAt ?? null,
    transactionId: raw.transactionId ?? null,
    confirmUrl: raw._self.confirmUrl,
  };
}

async function pokFetch(path: string, init: RequestInit): Promise<Response> {
  const accessToken = await getAccessToken();
  return fetch(`${getBaseUrl()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...init.headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

export interface CreateSdkOrderInput {
  amount: number;
  currencyCode: string;
  description?: string;
  merchantCustomReference?: string;
  webhookUrl?: string;
  redirectUrl?: string;
  failRedirectUrl?: string;
  expiresAfterMinutes?: number;
}

export async function createSdkOrder(input: CreateSdkOrderInput): Promise<PokSdkOrder> {
  const { merchantId } = getCredentials();
  const response = await pokFetch(`/merchants/${merchantId}/sdk-orders`, {
    method: "POST",
    body: JSON.stringify({ autoCapture: true, ...input }),
  });

  if (!response.ok) {
    throw new Error(`POK create order failed with status ${response.status}`);
  }

  return normalizeOrder(pokOrderResponseSchema.parse(await response.json()).data.sdkOrder);
}

export async function getSdkOrder(sdkOrderId: string): Promise<PokSdkOrder> {
  const { merchantId } = getCredentials();
  const response = await pokFetch(`/merchants/${merchantId}/sdk-orders/${sdkOrderId}`, { method: "GET" });

  if (!response.ok) {
    throw new Error(`POK get order failed with status ${response.status}`);
  }

  return normalizeOrder(pokOrderResponseSchema.parse(await response.json()).data.sdkOrder);
}
