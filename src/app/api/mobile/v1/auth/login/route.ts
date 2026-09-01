import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticateVendor, getVendorContext } from "@/db/queries/vendors";
import { getActiveDevice, issueRefreshToken, touchDeviceLastSeen } from "@/db/queries/mobile";
import { issueMobileAccessToken } from "@/lib/mobile/access-token";
import { getMobileCapabilities } from "@/lib/mobile/capabilities";
import { mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";
import { vendorHasPermission } from "@/lib/vendor-permissions";

const bodySchema = z.object({
  deviceId: z.coerce.number().int().positive(),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", "deviceId, email, and password are required.");
  }

  const device = await getActiveDevice(parsed.data.deviceId);
  if (!device) {
    return mobileErrorResponse(401, "device_not_active", "This device isn't activated or has been revoked.");
  }

  const auth = await authenticateVendor(parsed.data.email, parsed.data.password);
  if (!auth.ok) {
    return mobileErrorResponse(401, "invalid_credentials", "Incorrect email or password.");
  }

  const context = await getVendorContext(auth.id);
  if (!context || context.operatorId !== device.operatorId) {
    // Deliberately the same generic error as a wrong password -- a staff
    // account for a different operator shouldn't learn that this device
    // belongs to someone else's fleet.
    return mobileErrorResponse(401, "invalid_credentials", "Incorrect email or password.");
  }

  const vendor = { isOwner: context.isOwner, permissions: context.permissions };
  if (!vendorHasPermission(vendor, "scanner") && !vendorHasPermission(vendor, "bookings")) {
    return mobileErrorResponse(403, "not_authorized_for_app", "Your account doesn't have access to the ticket agent app.");
  }

  const capabilities = getMobileCapabilities();
  const accessToken = issueMobileAccessToken({
    vendorUserId: context.vendorUserId,
    deviceId: device.id,
    operatorId: context.operatorId,
    isOwner: context.isOwner,
    permissions: context.permissions,
    capabilities,
  });
  const refreshToken = await issueRefreshToken(device.id, context.vendorUserId);
  await touchDeviceLastSeen(device.id);

  return NextResponse.json({
    accessToken: accessToken.token,
    accessTokenExpiresAt: accessToken.expiresAt,
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt: refreshToken.expiresAt,
    vendor: {
      id: context.vendorUserId,
      name: context.vendorName,
      isOwner: context.isOwner,
      permissions: context.permissions,
      operatorName: context.operatorName,
    },
    capabilities,
  });
}
