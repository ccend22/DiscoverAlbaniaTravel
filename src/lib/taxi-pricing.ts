/** Every taxi journey is estimated at the owner's fixed €1/km rate. */
export const TAXI_PRICE_PER_KM_EUR = 1;

export interface TaxiPriceEstimate {
  km: number;
  priceEur: number;
  source: "distance";
}

export function estimateTaxiPriceEur(distanceKm: number | null): TaxiPriceEstimate | null {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return null;
  return {
    km: distanceKm,
    priceEur: Math.max(1, Math.round(distanceKm * TAXI_PRICE_PER_KM_EUR)),
    source: "distance",
  };
}
