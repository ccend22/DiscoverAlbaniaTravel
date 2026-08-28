import Link from "next/link";
import { TicketScanner } from "@/components/ticket-scanner";
import { requireVendorPermission } from "@/lib/vendor-access";
import { getVendorRoute } from "@/db/queries/vendors";

export default async function VendorTicketScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ routeId?: string }>;
}) {
  const { vendorUserId } = await requireVendorPermission("scanner");
  const { routeId: routeIdParam } = await searchParams;

  const routeId = routeIdParam ? Number(routeIdParam) : NaN;
  const route = Number.isInteger(routeId) ? await getVendorRoute(vendorUserId, routeId) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-3xl font-bold tracking-[-0.025em] text-foreground">Scan tickets</h1>
        <Link href="/vendor/scanner/log" className="text-sm text-teal hover:underline">Scan activity →</Link>
      </div>
      {route ? (
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Scanning for <span className="font-semibold text-foreground">{route.code} · {route.longName}</span>. A ticket booked for a different line will be flagged so it isn&apos;t boarded here by mistake.
        </p>
      ) : (
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Use the phone camera, take a photo, or enter a booking reference. Tickets are checked against your operator, payment, and travel date.
        </p>
      )}
      <div className="mt-7">
        <TicketScanner expectedRouteId={route?.id} expectedRouteLabel={route ? `${route.code} · ${route.longName}` : undefined} />
      </div>
    </div>
  );
}
