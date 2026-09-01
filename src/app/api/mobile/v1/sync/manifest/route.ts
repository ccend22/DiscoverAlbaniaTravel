import { NextResponse, type NextRequest } from "next/server";
import { getVendorOfflineSyncManifest } from "@/db/queries/vendors";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { requireMobileAuth } from "@/lib/mobile/require-mobile-auth";

export async function GET(request: NextRequest) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const date = request.nextUrl.searchParams.get("date") ?? getAlbaniaDateInputValue();
  const tickets = await getVendorOfflineSyncManifest(auth.auth.vendorUserId, date);

  return NextResponse.json({ date, tickets });
}
