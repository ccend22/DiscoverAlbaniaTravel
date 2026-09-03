import Link from "next/link";
import { getVendorDepartureCalendar } from "@/db/queries/vendors";
import { requireVendorPermission } from "@/lib/vendor-access";
import { formatTime } from "@/lib/format";

const DAY_LABEL = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

function cellTone(running: boolean, bookedSeats: number, plannedSeats: number) {
  if (!running) return "bg-surface-sunken text-muted/50";
  if (plannedSeats === 0) return "bg-surface-sunken text-muted";
  if (bookedSeats <= 0) return "bg-success-soft text-success";
  if (bookedSeats >= plannedSeats) return "bg-red-soft text-red";
  return "bg-warning-soft text-warning";
}

export default async function VendorCalendarPage() {
  const { vendorUserId } = await requireVendorPermission("calendar");
  const rows = await getVendorDepartureCalendar(vendorUserId, 14);

  const dates = rows[0]?.days.map((d) => d.date) ?? [];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Kalendari</h1>
      <p className="mt-1 text-sm text-muted">Vendet e lira dhe çmimi për çdo nisje gjatë dy javëve në vazhdim. Jeshile = e lirë, portokalli = pjesërisht e rezervuar, e kuqe = e shitur plot.</p>

      {rows.length === 0 ? (
        <p className="mt-6 rounded-md border border-border bg-surface p-6 text-center text-sm text-muted">Shto një nisje për ta parë këtu.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="sticky left-0 z-10 min-w-[220px] border-r border-border bg-surface px-4 py-3 text-left font-medium text-muted">Nisja</th>
                {dates.map((date) => (
                  <th key={date} className="min-w-[92px] px-2 py-3 text-center text-xs font-medium text-muted">
                    {DAY_LABEL.format(new Date(`${date}T00:00:00Z`))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="sticky left-0 z-10 border-r border-border bg-surface px-4 py-3 align-top">
                    <p className="font-medium text-foreground">{row.routeCode} · {formatTime(row.departureTime)}</p>
                    <p className="text-xs text-muted">{row.fromStationName} → {row.toStationName}</p>
                  </td>
                  {row.days.map((day) => (
                    <td key={day.date} className="p-1.5 text-center align-top">
                      {day.running ? (
                        <Link
                          href={`/vendor/manifest/${row.id}?date=${day.date}`}
                          title="Shiko listën e hipjes"
                          className={`block rounded-lg px-1.5 py-2 transition-transform hover:-translate-y-px hover:shadow-[var(--shadow-xs)] ${cellTone(day.running, day.bookedSeats, day.plannedSeats)}`}
                        >
                          <p className="font-semibold tabular-nums">{day.availableSeats}</p>
                          {row.basePrice && <p className="text-[11px] tabular-nums opacity-80">€{Number(row.basePrice).toFixed(2)}</p>}
                        </Link>
                      ) : (
                        <div className={`rounded-lg px-1.5 py-2 ${cellTone(day.running, day.bookedSeats, day.plannedSeats)}`}>
                          <p className="text-xs">—</p>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
