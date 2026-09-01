import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createManualBookingForVendor, getVendorBookingTicket } from "@/db/queries/vendors";
import { getCachedIdempotentResponse, storeIdempotentResponse } from "@/db/queries/mobile";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";
import { getMobileCapabilities } from "@/lib/mobile/capabilities";
import { vendorHasPermission } from "@/lib/vendor-permissions";
import { getFiscalizationProvider } from "@/lib/fiscalization";

const ENDPOINT = "tickets/sell";

// .nullish() throughout, not .optional() -- JSON clients (e.g. Kotlin's
// nullable types) send an explicit `null` for an absent value rather than
// omitting the key; .optional() alone only tolerates a missing key and
// fails the whole request on a present `null` (see tickets/validate for the
// full explanation, where this exact pattern was already found live).
const bodySchema = z.object({
  tripDepartureId: z.coerce.number().int().positive(),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passengerName: z.string().trim().min(2),
  passengerPhone: z.string().trim().min(6),
  passengerEmail: z.string().trim().toLowerCase().email().or(z.literal("")).nullish(),
  seats: z.coerce.number().int().min(1).max(9),
  routeStopId: z.coerce.number().int().positive().nullish(),
  paid: z.boolean(),
  amountOverride: z.string().nullish(),
});

// Selling a new ticket is never offline-queued and never safe to just retry
// blindly (unlike tickets/validate, which is CAS-safe at the DB layer) --
// every request must carry a client-generated Idempotency-Key so a retried
// request after a dropped response replays the original result instead of
// selling a second ticket.
export async function POST(request: NextRequest) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!idempotencyKey) {
    return mobileErrorResponse(400, "missing_idempotency_key", "An Idempotency-Key header is required to sell a ticket.");
  }

  // Always re-derived here, never trusted from the access token payload --
  // this is the production-activation gate (see src/lib/mobile/capabilities.ts).
  const capabilities = getMobileCapabilities();
  if (!capabilities.sellingEnabled) {
    return mobileErrorResponse(403, "selling_disabled", "Selling tickets from this app isn't enabled yet.");
  }

  const vendor = { isOwner: auth.auth.isOwner, permissions: auth.auth.permissions };
  if (!vendorHasPermission(vendor, "bookings")) {
    return mobileErrorResponse(403, "not_authorized", "Your account can't sell tickets.");
  }

  const cached = await getCachedIdempotentResponse(idempotencyKey);
  if (cached) {
    return NextResponse.json(cached.body, { status: cached.status });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", parsed.error.issues[0]?.message ?? "One or more fields are missing or invalid.");
  }

  const result = await createManualBookingForVendor(auth.auth.vendorUserId, {
    tripDepartureId: parsed.data.tripDepartureId,
    travelDate: parsed.data.travelDate,
    passengerName: parsed.data.passengerName,
    passengerPhone: parsed.data.passengerPhone,
    passengerEmail: parsed.data.passengerEmail || null,
    seats: parsed.data.seats,
    routeStopId: parsed.data.routeStopId ?? undefined,
    channel: "mobile",
    paid: parsed.data.paid,
    amountOverride: parsed.data.amountOverride ?? undefined,
  });

  if (!result.ok) {
    const responseBody = { error: { code: "sell_failed", message: result.error } };
    await storeIdempotentResponse(idempotencyKey, auth.auth.vendorUserId, ENDPOINT, 422, responseBody);
    return NextResponse.json(responseBody, { status: 422 });
  }

  const ticket = await getVendorBookingTicket(auth.auth.vendorUserId, result.bookingId);

  // Fiscalization is tied to the sale itself, not to whatever gets printed
  // later -- a reprint or a print of a booking sold elsewhere (website,
  // vendor panel) correctly never reaches this branch at all.
  const fiscalization = capabilities.fiscalPrintingEnabled
    ? await getFiscalizationProvider().requestFiscalization({
        bookingId: result.bookingId,
        amount: parsed.data.amountOverride ?? "0",
        currency: "EUR",
        passengerName: parsed.data.passengerName,
        issuedAt: new Date(),
      })
    : { fiscalized: false, reason: "fiscal_printing_disabled" as const };

  const responseBody = {
    bookingId: result.bookingId,
    bookingReference: result.reference,
    ticketToken: ticket?.ticketToken ?? null,
    fiscalization,
  };
  await storeIdempotentResponse(idempotencyKey, auth.auth.vendorUserId, ENDPOINT, 200, responseBody);
  return NextResponse.json(responseBody);
}
