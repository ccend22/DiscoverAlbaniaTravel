"use server";

import { validateTicketForVendor, type TicketValidationResult } from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";

export async function validateTicketAction(scannedValue: string, expectedRouteId?: number): Promise<TicketValidationResult> {
  const vendorUserId = await requireVendorSession();
  if (typeof scannedValue !== "string" || scannedValue.length > 256) {
    return { status: "invalid_code" };
  }
  return validateTicketForVendor(vendorUserId, scannedValue, expectedRouteId);
}
