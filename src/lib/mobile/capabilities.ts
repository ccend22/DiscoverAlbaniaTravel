// The production-activation gate: selling a ticket and printing a real
// fiscal-looking receipt must not be reachable in the field until a real
// certified fiscalization provider is live (see src/lib/fiscalization/).
// These flags are returned in the mobile login response and re-checked
// server-side on every gated endpoint -- never trust the client to have
// honored what it was told last time it logged in.
//
// Both default to disabled. MOBILE_CAPABILITIES_OVERRIDE exists only for
// dev/staging so the sell -> fiscalize(stub) -> print pipeline can be built
// and tested end-to-end before a real provider exists; it must never be set
// in the production environment.
export interface MobileCapabilities {
  sellingEnabled: boolean;
  fiscalPrintingEnabled: boolean;
}

export function getMobileCapabilities(): MobileCapabilities {
  if (process.env.NODE_ENV === "production") {
    return { sellingEnabled: false, fiscalPrintingEnabled: false };
  }
  const overridden = process.env.MOBILE_CAPABILITIES_OVERRIDE === "true";
  return { sellingEnabled: overridden, fiscalPrintingEnabled: overridden };
}
