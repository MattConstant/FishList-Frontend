/** Normalized place returned by `/api/geocode-search` (Open-Meteo geocoding). */
export type GeocodeSearchHit = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1: string | null;
};

export function formatGeocodeHitLabel(hit: GeocodeSearchHit): string {
  const parts = [hit.name];
  if (hit.admin1) parts.push(hit.admin1);
  if (hit.country) parts.push(hit.country);
  return parts.join(", ");
}
