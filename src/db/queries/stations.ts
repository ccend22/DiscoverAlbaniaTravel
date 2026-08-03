import { db } from "../index";
import { stations } from "../schema";

export interface StationLocation {
  id: number;
  name: string;
  code: string;
  city: string;
  address: string | null;
  latitude: string;
  longitude: string;
}

export async function listStationLocations(): Promise<StationLocation[]> {
  return db
    .select({
      id: stations.id,
      name: stations.name,
      code: stations.code,
      city: stations.city,
      address: stations.address,
      latitude: stations.latitude,
      longitude: stations.longitude,
    })
    .from(stations)
    .orderBy(stations.name);
}
