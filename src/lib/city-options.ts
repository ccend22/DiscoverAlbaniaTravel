interface StationRow {
  name: string;
  city: string;
}

/** The main hub cities -- also the ones with curated photography (see destination-images.ts's FEATURED_DESTINATION_KEYS, the same set by normalized key). Pinned above the full alphabetical From/To list as an anchor for first-time visitors. */
export const POPULAR_CITY_NAMES = ["Tiranë", "Durrës", "Sarandë", "Vlorë", "Shkodër", "Berat"];

/**
 * A single-station city's own station name is usually just a respelling of
 * the city (often missing diacritics, e.g. "Cerrik" vs "Cërrik") and adds no
 * real choice in the From/To picker -- only surface the station name
 * separately once a city has more than one, where it's genuinely
 * disambiguating (e.g. Durrës's 4 stops).
 */
export function buildCityOptions(stations: StationRow[]): string[] {
  const stationsByCity = new Map<string, Set<string>>();
  for (const s of stations) {
    if (!stationsByCity.has(s.city)) stationsByCity.set(s.city, new Set());
    stationsByCity.get(s.city)!.add(s.name);
  }
  return Array.from(
    new Set(stations.flatMap((s) => (stationsByCity.get(s.city)!.size > 1 ? [s.city, s.name] : [s.city])))
  ).sort();
}
