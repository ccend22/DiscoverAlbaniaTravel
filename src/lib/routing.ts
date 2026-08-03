export type LatLng = [number, number];

/**
 * Fetches a road-following path between two points from OSRM's public demo
 * routing server (free, no API key, but rate-limited and not meant for heavy
 * production traffic). Cached for an hour per coordinate pair since real
 * roads between fixed stations don't change. Returns null on any failure so
 * callers can fall back to a straight line.
 */
export async function getRoadRoute(from: LatLng, to: LatLng): Promise<LatLng[] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const coordinates = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length === 0) return null;

    return coordinates.map(([lng, lat]: [number, number]): LatLng => [lat, lng]);
  } catch {
    return null;
  }
}
