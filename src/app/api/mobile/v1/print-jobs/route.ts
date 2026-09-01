import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPrintJob, getPrintJobByIdempotencyKey } from "@/db/queries/mobile";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

// .nullish() throughout -- see tickets/validate for why .optional() alone
// isn't enough for a JSON client that sends explicit nulls.
const bodySchema = z
  .object({
    bookingId: z.coerce.number().int().positive().nullish(),
    type: z.enum(["ticket", "receipt", "reprint"]),
    isCopy: z.boolean().default(false),
    reprintReason: z.string().trim().min(1).nullish(),
    payload: z.record(z.string(), z.unknown()),
    clientIdempotencyKey: z.string().trim().min(1).nullish(),
  })
  .refine((data) => !data.isCopy || Boolean(data.reprintReason), {
    message: "reprintReason is required when isCopy is true.",
    path: ["reprintReason"],
  });

// A durable, retryable record of "N copies of this receipt need to
// physically print" -- decoupled from whatever sale/validation triggered it
// (see print_jobs in schema.ts). complete/fail below drive retry without
// re-selling or re-validating anything.
export async function POST(request: NextRequest) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid print job request.");
  }

  if (parsed.data.clientIdempotencyKey) {
    const existing = await getPrintJobByIdempotencyKey(parsed.data.clientIdempotencyKey);
    if (existing) return NextResponse.json(existing);
  }

  const job = await createPrintJob({
    deviceId: auth.auth.deviceId,
    vendorUserId: auth.auth.vendorUserId,
    bookingId: parsed.data.bookingId ?? null,
    type: parsed.data.type,
    isCopy: parsed.data.isCopy,
    reprintReason: parsed.data.reprintReason ?? null,
    payload: parsed.data.payload,
    clientIdempotencyKey: parsed.data.clientIdempotencyKey ?? undefined,
  });

  return NextResponse.json(job);
}
