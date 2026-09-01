import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateTicketForVendor } from "@/db/queries/vendors";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

const bodySchema = z.object({
  scannedValue: z.string().trim().min(1),
  // .nullish() (not .optional()) -- JSON clients that serialize a nullable
  // field (e.g. Kotlin's Int?) send an explicit `null` rather than omitting
  // the key entirely. .optional() only tolerates a missing key; a present
  // `null` value fails z.coerce.number() (Number(null) === 0, which then
  // fails .positive()), which used to silently fail the *whole* request
  // with a misleading "scannedValue is required" error even though
  // scannedValue itself was fine.
  expectedRouteId: z.coerce.number().int().positive().nullish(),
});

// A thin HTTP wrapper -- validateTicketForVendor already does the real work,
// including the idempotent check-in write (a CAS update guarded on
// ticketCheckedInAt IS NULL) and the ticket_scans audit log. Safe to call
// repeatedly with the same scannedValue; a retry after a dropped response
// just resolves to "already_used" rather than double-counting anything.
export async function POST(request: NextRequest) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request body.");
  }

  const result = await validateTicketForVendor(
    auth.auth.vendorUserId,
    parsed.data.scannedValue,
    parsed.data.expectedRouteId ?? undefined
  );
  return NextResponse.json(result);
}
