import { NextResponse, type NextRequest } from "next/server";
import { listVendorDepartures } from "@/db/queries/vendors";
import { getAlbaniaDateInputValue } from "@/lib/timezone";
import { requireMobileAuth } from "@/lib/mobile/require-mobile-auth";

// ISO weekday (1=Monday..7=Sunday), matching how trip_departures.weekdays is
// checked everywhere else (see isDepartureValidOnDate's `extract(isodow ...)`).
function isoWeekdayInAlbania(): number {
  const [year, month, day] = getAlbaniaDateInputValue().split("-").map(Number);
  const utcDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
}

export async function GET(request: NextRequest) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const today = getAlbaniaDateInputValue();
  const todayWeekday = isoWeekdayInAlbania();
  const departures = await listVendorDepartures(auth.auth.vendorUserId);
  const runningToday = departures.filter((d) => d.canBoard && d.weekdays.includes(todayWeekday));

  return NextResponse.json({
    date: today,
    trips: runningToday.map((d) => ({
      id: d.id,
      routeId: d.routeId,
      routeCode: d.routeCode,
      routeLongName: d.routeLongName,
      fromStationName: d.fromStationName,
      toStationName: d.toStationName,
      departureTime: d.departureTime,
      arrivalTime: d.arrivalTime,
      plannedSeats: d.plannedSeats,
    })),
  });
}
