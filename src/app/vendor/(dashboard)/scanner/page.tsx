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
      <h1 className="font-display text-3xl font-bold tracking-[-0.025em] text-foreground">Skano biletat</h1>
      {route ? (
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Duke skanuar për <span className="font-semibold text-foreground">{route.code} · {route.longName}</span>. Një biletë e rezervuar për një linjë tjetër do të shënohet që të mos hipë gabimisht këtu.
        </p>
      ) : (
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Përdor kamerën e telefonit, bëj një foto, ose shkruaj referencën e rezervimit. Biletat kontrollohen kundrejt operatorit, pagesës dhe datës së udhëtimit.
        </p>
      )}
      <div className="mt-7">
        <TicketScanner expectedRouteId={route?.id} expectedRouteLabel={route ? `${route.code} · ${route.longName}` : undefined} />
      </div>
    </div>
  );
}
