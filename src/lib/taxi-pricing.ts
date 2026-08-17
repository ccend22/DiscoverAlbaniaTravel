import { normalizeSearchText } from "@/lib/search-normalize";

/**
 * Flat rate for the intercity taxi form -- these are pre-scheduled, long
 * (>= MIN_INTERCITY_TAXI_DISTANCE_KM) trips booked hours ahead, not instant
 * local rides, so a simple per-km rate is what the reference partner fares
 * (Lux/Blue/Merr/Smart/City/Thirr Taxi) roughly work out to for this length
 * of trip. This is shown to the customer as an estimate; the taxi provider
 * still sets the real quote when accepting the request.
 */
export const TAXI_PRICE_PER_KM_EUR = 1;

/**
 * Known driving distances from Tirana, sourced from a fare-comparison sheet
 * across several local taxi operators. Where operators disagreed, this
 * picked the most complete/consistent figure (usually Blue Taxi's, which had
 * the fullest "Distanca" column) rather than averaging blindly. Keys are
 * pre-normalized (normalizeSearchText) for matching against whatever a
 * user types or Google Places resolves. Destinations the sheet didn't give
 * a reliable km figure for (e.g. Thethi, Valbona, Boville) are intentionally
 * left out -- those fall back to the live coordinate-based estimate instead.
 */
const KNOWN_DESTINATIONS_KM_FROM_TIRANA: Record<string, number> = {
  "equos resort": 13,
  "gjiri i lalezit": 45,
  vaqarr: 9.2,
  petrela: 14,
  pellumbas: 19,
  "kepi i rodonit": 54,
  "mrizi i zanave": 81,
  berat: 130,
  kruje: 35,
  shkoder: 102,
  belsh: 60,
  gjirokaster: 224,
  durres: 36,
  koman: 129,
  prizren: 183,
  vlore: 156,
  dajt: 23,
  "kantina duka": 42,
  dhermi: 220,
  lezhe: 64,
};

function isTiranaLike(value: string): boolean {
  const normalized = normalizeSearchText(value);
  return normalized.includes("tirane") || normalized.includes("tirana");
}

/** Substring match against the normalized place name Google (or the user) gave us -- addresses usually carry the city/landmark name somewhere in them. */
function findKnownDestinationKm(placeName: string): number | null {
  const normalized = normalizeSearchText(placeName);
  for (const [key, km] of Object.entries(KNOWN_DESTINATIONS_KM_FROM_TIRANA)) {
    if (normalized.includes(key)) return km;
  }
  return null;
}

export interface TaxiPriceEstimate {
  km: number;
  priceEur: number;
  /** Whether this came from the known-route table (a named place matched against Tirana) or a live coordinate distance -- shown differently isn't required, but callers can use this to caveat the number. */
  source: "known-route" | "calculated";
}

/**
 * Estimates the fare for the taxi quick-form. A named, recognized
 * destination (typed and selected from the suggestions, e.g. "Tirane -
 * Durres") is priced directly off the reference table -- that's real
 * driving distance, more accurate than a straight-line guess. Anything else
 * (a pin dropped on the map, or a place the table doesn't cover) falls back
 * to the live straight-line distance already computed for the eligibility
 * check.
 */
export function estimateTaxiPriceEur(
  pickup: string,
  destination: string,
  distanceKm: number | null
): TaxiPriceEstimate | null {
  const pickupIsTirana = isTiranaLike(pickup);
  const destinationIsTirana = isTiranaLike(destination);

  if (pickupIsTirana !== destinationIsTirana) {
    const otherEnd = pickupIsTirana ? destination : pickup;
    const knownKm = findKnownDestinationKm(otherEnd);
    if (knownKm !== null) {
      return { km: knownKm, priceEur: Math.round(knownKm * TAXI_PRICE_PER_KM_EUR), source: "known-route" };
    }
  }

  if (distanceKm !== null) {
    return { km: distanceKm, priceEur: Math.round(distanceKm * TAXI_PRICE_PER_KM_EUR), source: "calculated" };
  }

  return null;
}
