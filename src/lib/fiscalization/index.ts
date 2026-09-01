// Albania's real-time fiscal-receipt reporting ("Fiscalizimi") isn't
// integrated anywhere in this codebase yet -- no certified provider has been
// chosen. This interface exists so the mobile sell/print pipeline can be
// built and tested end-to-end now, against StubFiscalizationProvider, without
// waiting on that decision. A real implementation plugs in behind this same
// interface later with no caller-side changes.
//
// Selling a ticket and printing a fiscal-looking receipt must never reach
// real customers before a real provider is live -- that's enforced by the
// `capabilities.sellingEnabled` / `fiscalPrintingEnabled` flags in the mobile
// login response (src/lib/mobile/capabilities.ts), not by anything in here.
// This module only answers "did fiscalization succeed," it doesn't gate
// whether the feature is reachable at all.

export interface FiscalizationReceiptInput {
  bookingId: number;
  amount: string;
  currency: string;
  passengerName: string;
  issuedAt: Date;
}

export interface FiscalizationResult {
  fiscalized: boolean;
  nivf?: string;
  nslf?: string;
  qrData?: string;
  reason?: string;
}

export interface FiscalizationProvider {
  requestFiscalization(receipt: FiscalizationReceiptInput): Promise<FiscalizationResult>;
}

export class StubFiscalizationProvider implements FiscalizationProvider {
  async requestFiscalization(_receipt: FiscalizationReceiptInput): Promise<FiscalizationResult> {
    return { fiscalized: false, reason: "no_provider_configured" };
  }
}

export function getFiscalizationProvider(): FiscalizationProvider {
  return new StubFiscalizationProvider();
}
