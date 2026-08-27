/** Flat service fee added on top of the fare for an online bus booking (per reservation, not per seat). */
export const BUS_BOOKING_SERVICE_FEE_EUR = 1;

/** Share of the fare charged as a service fee for each taxi passenger. */
export const TAXI_BOOKING_SERVICE_FEE_RATE_PER_PASSENGER = 0.05;

/** Taxi service fee: 5% of the fare, per passenger -- so it compounds with passenger count same as the fare itself would for a shared ride. */
export function calculateTaxiServiceFeeEur(fareEur: number, passengers: number): number {
  return fareEur * TAXI_BOOKING_SERVICE_FEE_RATE_PER_PASSENGER * passengers;
}
