export const VENDOR_PERMISSIONS = [
  { key: "calendar", label: "Kalendari" },
  { key: "bookings", label: "Rezervimet" },
  { key: "scanner", label: "Skano biletat" },
  { key: "finance", label: "Financat" },
  { key: "routes", label: "Linjat dhe stacionet" },
  { key: "departures", label: "Nisjet" },
] as const;

export type VendorPermission = (typeof VENDOR_PERMISSIONS)[number]["key"];

export const VENDOR_PERMISSION_KEYS = VENDOR_PERMISSIONS.map((p) => p.key);

export function isVendorPermission(value: string): value is VendorPermission {
  return (VENDOR_PERMISSION_KEYS as string[]).includes(value);
}

export function vendorPermissionLabel(key: string): string {
  return VENDOR_PERMISSIONS.find((p) => p.key === key)?.label ?? key;
}

/** The owner always has every permission; a teammate is scoped to whatever's in their `permissions` array. */
export function vendorHasPermission(
  vendor: { isOwner: boolean; permissions: string[] },
  permission: VendorPermission
): boolean {
  return vendor.isOwner || vendor.permissions.includes(permission);
}
