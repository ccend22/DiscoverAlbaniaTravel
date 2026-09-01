import { NextResponse, type NextRequest } from "next/server";
import { getVendorManifest } from "@/db/queries/vendors";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tripDepartureId = Number(id);
  if (!Number.isInteger(tripDepartureId) || tripDepartureId <= 0) {
    return mobileErrorResponse(400, "invalid_trip_id", "Trip id must be a positive integer.");
  }

  const date = request.nextUrl.searchParams.get("date") ?? getAlbaniaDateInputValue();
  const manifest = await getVendorManifest(auth.auth.vendorUserId, tripDepartureId, date);
  if (!manifest) {
    return mobileErrorResponse(404, "trip_not_found", "That trip doesn't belong to your fleet.");
  }

  return NextResponse.json(manifest);
}
