import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateTicketForVendor } from "@/db/queries/vendors";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

const bodySchema = z.object({
  scannedValue: z.string().trim().min(1),
  expectedRouteId: z.coerce.number().int().positive().optional(),
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
    return mobileErrorResponse(400, "invalid_request", "scannedValue is required.");
  }

  const result = await validateTicketForVendor(auth.auth.vendorUserId, parsed.data.scannedValue, parsed.data.expectedRouteId);
  return NextResponse.json(result);
}
