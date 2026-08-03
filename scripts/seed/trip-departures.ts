import { db } from "../../src/db";
import { tripDepartures } from "../../src/db/schema";
import { readCsv } from "./csv";

interface ItineraryRow {
  route_code: string;
  from_stop: string;
  to_stop: string;
  departure_time: string;
  arrival_time: string;
  duration_min: string;
  distance_km: string;
  ticket_price: string;
  weekdays: string;
  planned_seats: string;
  free_seats: string;
  can_board: string;
}

export async function seedTripDepartures(
  routeCodeToId: Map<string, number>,
  stationNameToId: Map<string, number>
): Promise<number> {
  const rows = readCsv<ItineraryRow>("data/itineraries.csv");

  let count = 0;
  for (const row of rows) {
    const routeId = routeCodeToId.get(row.route_code);
    const fromStationId = stationNameToId.get(row.from_stop);
    const toStationId = stationNameToId.get(row.to_stop);
    if (routeId === undefined || fromStationId === undefined || toStationId === undefined) {
      throw new Error(
        `Unresolved FK for route ${row.route_code}: ${row.from_stop} -> ${row.to_stop}`
      );
    }

    const weekdays = row.weekdays
      .split(",")
      .map((w) => Number(w.trim()))
      .filter((w) => !Number.isNaN(w))
      .sort((a, b) => a - b);
    const plannedSeats = Number(row.planned_seats) || 60;
    const sourceFreeSeats = Number(row.free_seats);
    const canBoard = row.can_board.toLowerCase() === "true";
    const freeSeats = canBoard
      ? sourceFreeSeats > 0
        ? Math.min(sourceFreeSeats, plannedSeats)
        : plannedSeats
      : 0;

    await db
      .insert(tripDepartures)
      .values({
        routeId,
        fromStationId,
        toStationId,
        departureTime: row.departure_time,
        arrivalTime: row.arrival_time,
        durationMin: row.duration_min || "0",
        distanceKm: row.distance_km || "0",
        weekdays,
        basePrice: row.ticket_price || "1",
        plannedSeats,
        freeSeats,
        canBoard,
      })
      .onConflictDoUpdate({
        target: [
          tripDepartures.routeId,
          tripDepartures.fromStationId,
          tripDepartures.toStationId,
          tripDepartures.departureTime,
        ],
        set: {
          arrivalTime: row.arrival_time,
          durationMin: row.duration_min || "0",
          distanceKm: row.distance_km || "0",
          weekdays,
          basePrice: row.ticket_price || "1",
          plannedSeats,
          freeSeats,
          canBoard,
        },
      });
    count++;
  }

  console.log(`trip_departures: seeded ${count}`);
  return count;
}
