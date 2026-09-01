import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { activateDevice } from "@/db/queries/mobile";
import { mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

const bodySchema = z.object({
  activationCode: z.string().trim().min(1),
  deviceIdentifier: z.string().trim().min(1).max(256),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", "activationCode and deviceIdentifier are required.");
  }

  const result = await activateDevice(parsed.data.activationCode, parsed.data.deviceIdentifier);
  if (!result.ok) {
    return mobileErrorResponse(410, "invalid_or_expired_code", "This activation code is invalid or has expired.");
  }

  return NextResponse.json({ deviceId: result.deviceId });
}
