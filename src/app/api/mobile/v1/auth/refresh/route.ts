import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getVendorContext } from "@/db/queries/vendors";
import { rotateRefreshToken, touchDeviceLastSeen, verifyRefreshToken } from "@/db/queries/mobile";
import { issueMobileAccessToken } from "@/lib/mobile/access-token";
import { getMobileCapabilities } from "@/lib/mobile/capabilities";
import { mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

const bodySchema = z.object({ refreshToken: z.string().min(1) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", "refreshToken is required.");
  }

  const verified = await verifyRefreshToken(parsed.data.refreshToken);
  if (!verified.ok) {
    return mobileErrorResponse(401, verified.error, "Refresh token is no longer valid. Please log in again.");
  }

  const context = await getVendorContext(verified.vendorUserId);
  if (!context || context.vendorStatus !== "approved") {
    return mobileErrorResponse(401, "vendor_not_approved", "This account is no longer active.");
  }

  const [accessToken, rotated] = await Promise.all([
    Promise.resolve(
      issueMobileAccessToken({
        vendorUserId: context.vendorUserId,
        deviceId: verified.deviceId,
        operatorId: context.operatorId,
        isOwner: context.isOwner,
        permissions: context.permissions,
        capabilities: getMobileCapabilities(),
      })
    ),
    rotateRefreshToken(verified.tokenRowId, verified.deviceId, verified.vendorUserId),
    touchDeviceLastSeen(verified.deviceId),
  ]);

  return NextResponse.json({
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    refreshToken: rotated.token,
    refreshTokenExpiresAt: rotated.expiresAt,
    capabilities: getMobileCapabilities(),
  });
}
