import { TicketScanner } from "@/components/ticket-scanner";
import { requireVendorPermission } from "@/lib/vendor-access";

export default async function VendorTicketScannerPage() {
  await requireVendorPermission("scanner");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-bold tracking-[-0.025em] text-foreground">Scan tickets</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Use the phone camera, take a photo, or enter a booking reference. Tickets are checked against your operator, payment, travel date, and scheduled time.
      </p>
      <div className="mt-7">
        <TicketScanner />
      </div>
    </div>
  );
}
