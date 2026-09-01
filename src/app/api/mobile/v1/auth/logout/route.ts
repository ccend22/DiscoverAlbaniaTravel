import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revokeRefreshToken } from "@/db/queries/mobile";
import { mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

const bodySchema = z.object({ refreshToken: z.string().min(1) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", "refreshToken is required.");
  }

  await revokeRefreshToken(parsed.data.refreshToken);
  return NextResponse.json({ ok: true });
}
