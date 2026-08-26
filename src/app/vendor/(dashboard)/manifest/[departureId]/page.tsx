import Link from "next/link";
import { notFound } from "next/navigation";
import { getVendorManifest } from "@/db/queries/vendors";
import { requireVendorSession } from "@/lib/vendor-session";
import { PrintButton } from "@/components/print-button";
import { formatDateLong, formatTime } from "@/lib/format";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { CheckCircleIcon } from "@/components/icons";
import { LinkButton } from "@/components/ui/button";

const CHANNEL_LABELS: Record<string, string> = {
  online: "Online",
  walk_in: "Walk-in",
  phone: "Phone",
  touch_screen: "Touch screen",
};

export default async function VendorManifestPage({
  params,
  searchParams,
}: {
  params: Promise<{ departureId: string }>;
  searchParams: Promise<{ date?: string }>;
}) {
  const vendorUserId = await requireVendorSession();
  const [{ departureId }, { date: dateParam }] = await Promise.all([params, searchParams]);
  const tripDepartureId = Number(departureId);
  if (!Number.isInteger(tripDepartureId)) notFound();

  const date = dateParam || getAlbaniaDateInputValue();
  const manifest = await getVendorManifest(vendorUserId, tripDepartureId, date);
  if (!manifest) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/vendor/departures" className="text-sm text-teal hover:underline print:hidden">← Back to departures</Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-teal">Boarding list</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-foreground">
            {manifest.routeCode} · {manifest.fromStationName} → {manifest.toStationName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {manifest.operatorName} · Departs {formatTime(manifest.departureTime)}, arrives {formatTime(manifest.arrivalTime)} · {formatDateLong(date)}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <LinkButton href="/vendor/scanner" variant="outline" size="sm">Scan tickets</LinkButton>
          <PrintButton />
        </div>
      </div>

      <form method="get" className="mt-4 flex items-end gap-2 print:hidden">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Travel date</span>
          <input name="date" type="date" defaultValue={date} className="min-h-11 rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <button type="submit" className="min-h-11 rounded-md border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-sunken">
          Go
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {manifest.passengers.length} booking{manifest.passengers.length === 1 ? "" : "s"} · {manifest.totalSeatsBooked} seat{manifest.totalSeatsBooked === 1 ? "" : "s"} booked
      </p>

      <div className="mt-3 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)] print:border-black">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="border-b border-border text-left text-muted print:text-black">
            <tr>
              <th className="w-10 px-4 py-3 font-medium print:hidden"><span className="sr-only">Boarded</span></th>
              <th className="px-4 py-3 font-medium">Passenger</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Seats</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Channel</th>
            </tr>
          </thead>
          <tbody>
            {manifest.passengers.map((passenger) => (
              <tr key={passenger.bookingReference} className="border-b border-border last:border-0">
                <td className="px-4 py-3 print:hidden">
                  {passenger.checkedInAt ? (
                    <CheckCircleIcon width={20} height={20} className="text-success" aria-label="Boarded" />
                  ) : (
                    <span className="block h-5 w-5 rounded border border-border" aria-label="Not scanned" />
                  )}
                </td>
                <td className="px-4 py-3 align-top text-foreground">
                  <p className="font-medium">{passenger.passengerName}</p>
                  {passenger.passengerEmail && <p className="text-xs text-muted">{passenger.passengerEmail}</p>}
                </td>
                <td className="px-4 py-3 align-top text-muted">{passenger.passengerPhone}</td>
                <td className="px-4 py-3 align-top tabular-nums text-foreground">{passenger.seats}</td>
                <td className="px-4 py-3 align-top font-mono text-xs text-muted">{passenger.bookingReference}</td>
                <td className="px-4 py-3 align-top text-muted">{CHANNEL_LABELS[passenger.channel]}</td>
              </tr>
            ))}
            {manifest.passengers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">No bookings for this date yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
