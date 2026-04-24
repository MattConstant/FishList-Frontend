/**
 * Refines GeoHub’s approximate stocking coordinates using OpenStreetMap Nominatim
 * (via same-origin proxy — see /api/geocode/lake).
 */

/** Bump when server geocode logic changes — avoids stale bad pins in-session. */
const CLIENT_CACHE_VER = 4;
const mem = new Map<string, { lat: number; lng: number } | "miss">();

export async function refineLakePin(
  groupKey: string,
  waterbody: string,
  hintLat: number,
  hintLng: number,
): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${CLIENT_CACHE_VER}:${groupKey}`;
  const cached = mem.get(cacheKey);
  if (cached === "miss") return null;
  if (cached && typeof cached === "object") return cached;

  const params = new URLSearchParams({
    q: waterbody.trim(),
    lat: String(hintLat),
    lng: String(hintLng),
  });
  const res = await fetch(`/api/geocode/lake?${params.toString()}`);
  if (!res.ok) {
    mem.set(cacheKey, "miss");
    return null;
  }
  const data = (await res.json()) as {
    lat?: number;
    lng?: number;
    notFound?: boolean;
  };
  if (data.notFound || typeof data.lat !== "number" || typeof data.lng !== "number") {
    mem.set(cacheKey, "miss");
    return null;
  }
  const out = { lat: data.lat, lng: data.lng };
  mem.set(cacheKey, out);
  return out;
}
