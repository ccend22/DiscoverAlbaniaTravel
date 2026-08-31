"use client";

import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { ToggleChip } from "./toggle-chip";

interface DepartureOption {
  id: number;
  routeId: number;
  routeCode: string;
  fromStationName: string;
  toStationName: string;
  departureTime: string;
  basePrice: string | null;
}

interface RouteStopOption {
  id: number;
  routeId: number;
  routeCode: string;
  stationName: string;
  priceToDestination: string | null;
}

interface VendorManualBookingFormProps {
  departures: DepartureOption[];
  routeStopOptions: RouteStopOption[];
  serviceFeeEur: string;
  todayDate: string;
  initialChannel?: "walk_in" | "phone" | "touch_screen";
  touchScreenMode?: boolean;
  action: (formData: FormData) => void;
}

// Larger tap targets throughout this form -- it doubles as a touch-screen
// kiosk workflow (see the "touch_screen" booking channel), not just a
// mouse/keyboard form for a vendor at a desk.
const FIELD_CLASS = "min-h-14 rounded-xl border border-border bg-background px-4 py-3 text-base outline-none focus:border-teal";

export function VendorManualBookingForm({
  departures,
  routeStopOptions,
  serviceFeeEur,
  todayDate,
  initialChannel = "walk_in",
  touchScreenMode = false,
  action,
}: VendorManualBookingFormProps) {
  const [departureId, setDepartureId] = useState("");
  const [routeStopId, setRouteStopId] = useState("");
  const [seats, setSeats] = useState(1);
  const [amountOverride, setAmountOverride] = useState<string | null>(null);

  const selectedDeparture = useMemo(
    () => departures.find((d) => String(d.id) === departureId) ?? null,
    [departures, departureId]
  );

  // Up to 5 departure options, tapping a chip beats hunting through a
  // dropdown -- past that, a select scales better than a wall of buttons.
  const useDepartureChips = departures.length > 0 && departures.length <= 5;

  const stopsForRoute = useMemo(
    () => (selectedDeparture ? routeStopOptions.filter((s) => s.routeId === selectedDeparture.routeId) : []),
    [routeStopOptions, selectedDeparture]
  );

  const selectedStop = useMemo(
    () => stopsForRoute.find((s) => String(s.id) === routeStopId) ?? null,
    [stopsForRoute, routeStopId]
  );

  const farePerSeat = selectedStop?.priceToDestination ?? selectedDeparture?.basePrice ?? null;
  const fareTotal = farePerSeat !== null ? Number(farePerSeat) * seats : null;
  const feeAmount = Number(serviceFeeEur);
  const computedTotal = fareTotal !== null ? fareTotal + feeAmount : null;
  const displayedTotal = amountOverride ?? (computedTotal !== null ? computedTotal.toFixed(2) : "");

  function handleDepartureChange(value: string) {
    setDepartureId(value);
    setRouteStopId("");
    setAmountOverride(null);
  }

  return (
    <form action={action} className="mt-6 grid gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-xs)] sm:grid-cols-2">
      <div className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Departure</span>
        {useDepartureChips ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {departures.map((departure) => (
              <ToggleChip
                key={departure.id}
                type="radio"
                name="tripDepartureId"
                value={String(departure.id)}
                required
                checked={departureId === String(departure.id)}
                onChange={() => handleDepartureChange(String(departure.id))}
                label={`${departure.routeCode} · ${departure.fromStationName} · ${departure.departureTime}`}
              />
            ))}
          </div>
        ) : (
          <select
            name="tripDepartureId"
            required
            value={departureId}
            onChange={(e) => handleDepartureChange(e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Choose departure</option>
            {departures.map((departure) => (
              <option key={departure.id} value={departure.id}>
                {departure.routeCode} · {departure.fromStationName} · {departure.departureTime}
              </option>
            ))}
          </select>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Travel date</span>
        <input name="travelDate" type="date" min={todayDate} defaultValue={todayDate} required className={FIELD_CLASS} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Seats</span>
        <input
          name="seats"
          type="number"
          min="1"
          max="9"
          value={seats}
          onChange={(e) => setSeats(Math.max(1, Number(e.target.value) || 1))}
          required
          className={FIELD_CLASS}
        />
      </label>

      {stopsForRoute.length > 0 && (
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium">Boarding stop <span className="font-normal text-muted">(leave as full route to board at the start)</span></span>
          <select
            name="routeStopId"
            value={routeStopId}
            onChange={(e) => {
              setRouteStopId(e.target.value);
              setAmountOverride(null);
            }}
            className={FIELD_CLASS}
          >
            <option value="">
              Full itinerary: {selectedDeparture?.fromStationName} → {selectedDeparture?.toStationName} (default fare)
            </option>
            {stopsForRoute.map((stop) => (
              <option key={stop.id} value={stop.id}>
                board at {stop.stationName}
                {stop.priceToDestination ? ` · €${stop.priceToDestination}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <input type="hidden" name="channel" value={touchScreenMode ? "touch_screen" : initialChannel} />

      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="font-medium">Passenger name</span>
        <input name="passengerName" required className={FIELD_CLASS} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Phone <span className="font-normal text-muted">(optional)</span></span>
        <input name="passengerPhone" className={FIELD_CLASS} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Email <span className="font-normal text-muted">(optional)</span></span>
        <input name="passengerEmail" type="email" className={FIELD_CLASS} />
      </label>

      <div className="sm:col-span-2 rounded-lg border border-border bg-surface-sunken p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted">Fare{seats > 1 ? ` (${seats} seats)` : ""}</span>
          <span className="font-medium text-foreground">{fareTotal !== null ? `€${fareTotal.toFixed(2)}` : "—"}</span>
        </div>
        <label className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-sm">
          <span className="font-medium">Amount to collect (EUR)</span>
          <input
            name="amountOverride"
            type="number"
            min="0"
            step="0.01"
            value={displayedTotal}
            onChange={(e) => setAmountOverride(e.target.value)}
            className="min-h-11 rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-teal"
          />
        </label>
      </div>

      {touchScreenMode ? (
        <div className="sm:col-span-2">
          <input type="hidden" name="paid" value="true" />
          <Button type="submit" className="min-h-14 w-full text-base sm:min-h-16 sm:text-lg">
            Create and show QR ticket
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row">
          <Button type="submit" variant="outline" className="min-h-14 flex-1 text-base">
            Create booking
          </Button>
          <Button type="submit" name="paid" value="true" className="min-h-14 flex-1 text-base">
            Book is Paid
          </Button>
        </div>
      )}
    </form>
  );
}
