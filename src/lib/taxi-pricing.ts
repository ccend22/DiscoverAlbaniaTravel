/** Custom pin-to-pin journeys are estimated at the owner's fixed €1/km rate. */
export const TAXI_PRICE_PER_KM_EUR = 1;

export interface MapTaxiPriceEstimate {
  km: number;
  priceEur: number;
  source: "map";
}

export function estimateMapTaxiPriceEur(distanceKm: number | null): MapTaxiPriceEstimate | null {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return null;
  return {
    km: distanceKm,
    priceEur: Math.max(1, Math.round(distanceKm * TAXI_PRICE_PER_KM_EUR)),
    source: "map",
  };
}
