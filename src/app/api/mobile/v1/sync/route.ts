import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { validateTicketForVendor } from "@/db/queries/vendors";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

const bodySchema = z.object({
  validations: z
    .array(
      z.object({
        clientIdempotencyKey: z.string().trim().min(1),
        scannedValue: z.string().trim().min(1),
        // .nullish() -- see tickets/validate for why .optional() alone lets
        // an explicit JSON null fail the whole batch item.
        expectedRouteId: z.coerce.number().int().positive().nullish(),
      })
    )
    .min(1)
    .max(200),
});

// Batch-replays queued offline validations, in submitted order, through the
// same validateTicketForVendor used by the online path -- its check-in
// write is already CAS-guarded (WHERE ticketCheckedInAt IS NULL), so a
// ticket scanned offline on two different devices resolves to one winner
// here and an "already_used" conflict for the other, rather than either
// erroring or double-checking anyone in. clientIdempotencyKey is only a
// correlation id for the app to match responses back to its local queue --
// the correctness guarantee is the CAS update itself, not this key.
export async function POST(request: NextRequest) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", parsed.error.issues[0]?.message ?? "validations must be a non-empty array (max 200 per batch).");
  }

  const results = [];
  for (const item of parsed.data.validations) {
    const result = await validateTicketForVendor(auth.auth.vendorUserId, item.scannedValue, item.expectedRouteId ?? undefined);
    results.push({ clientIdempotencyKey: item.clientIdempotencyKey, result });
  }

  return NextResponse.json({ results });
}
