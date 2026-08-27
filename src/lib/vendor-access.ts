import { redirect } from "next/navigation";
import { requireVendorSession } from "./vendor-session";
import { getVendorContext } from "@/db/queries/vendors";
import { vendorHasPermission, type VendorPermission } from "./vendor-permissions";

/**
 * Combines the usual "signed in, approved vendor" guard with a permission
 * check, so a teammate the owner hasn't granted `permission` to is bounced
 * to the overview instead of the page they don't have access to. The owner
 * always passes, regardless of what's in their `permissions` array.
 */
export async function requireVendorPermission(permission: VendorPermission) {
  const vendorUserId = await requireVendorSession();
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");
  if (!vendorHasPermission(context, permission)) redirect("/vendor");
  return { vendorUserId, context };
}

/** Team/permission management is the one thing that can't be delegated -- only the owner reaches pages that use this. */
export async function requireVendorOwner() {
  const vendorUserId = await requireVendorSession();
  const context = await getVendorContext(vendorUserId);
  if (!context || context.vendorStatus !== "approved") redirect("/vendor/login");
  if (!context.isOwner) redirect("/vendor");
  return { vendorUserId, context };
}
