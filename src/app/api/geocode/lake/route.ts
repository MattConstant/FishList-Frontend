import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "FishList/1.0 (https://openstreetmap.org; lake map pin refinement)";

type NominatimHit = {
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  importance?: number;
};

/** Bump when scoring/query logic changes (invalidates in-process cache entries). */
const CACHE_VERSION = 4;

/** Names that imply we want a waterbody polygon, not a stream/river along it. */
function isLakeLikeQuery(q: string): boolean {
  return /\b(lake|pond|reservoir|waterbody|bay|basin|lagoon)\b/i.test(q);
}

/** Linear water features — often closest to GeoHub’s hint but wrong for “… Lake” pins. */
function isStreamRiverWaterway(hit: NominatimHit): boolean {
  const cls = (hit.class ?? "").toLowerCase();
  const typ = (hit.type ?? "").toLowerCase();
  if (cls === "waterway") return true;
  if (typ.includes("stream") || typ.includes("river")) return true;
  if (typ.includes("canal") || typ.includes("ditch") || typ.includes("drain")) return true;
  return false;
}

/**
 * Area water polygons in OSM (what we want for stocking pins). Excludes rivers/streams.
 * GeoHub coords are often on land — we must not pick the nearest road/POI to the hint.
 */
function isWaterbodyPolygonHit(hit: NominatimHit): boolean {
  if (isStreamRiverWaterway(hit)) return false;
  const cls = (hit.class ?? "").toLowerCase();
  const typ = (hit.type ?? "").toLowerCase();
  if (cls === "water") {
    if (typ.includes("river")) return false;
    return true;
  }
  if (cls === "natural") {
    if (typ === "water") return true;
    if (/\b(lake|pond|bay|reservoir|wetland)\b/.test(typ)) return true;
  }
  return false;
}

function isUnwantedLandPoi(hit: NominatimHit): boolean {
  const cls = (hit.class ?? "").toLowerCase();
  if (cls === "boundary") return true;
  if (
    cls === "highway" ||
    cls === "railway" ||
    cls === "aerialway" ||
    cls === "amenity" ||
    cls === "shop" ||
    cls === "tourism" ||
    cls === "historic" ||
    cls === "man_made"
  ) {
    return true;
  }
  if (cls === "place") {
    const typ = (hit.type ?? "").toLowerCase();
    if (typ.includes("house") || typ.includes("farm")) return true;
  }
  if (cls === "leisure") {
    const typ = (hit.type ?? "").toLowerCase();
    if (!typ.includes("swimming")) return true;
  }
  if (cls === "office") return true;
  return false;
}

/** Nominatim "place" hits (cities, towns) are a common false positive for "… Lake" OSM name collisions. */
function isPopulationCenterPlace(hit: NominatimHit): boolean {
  const cls = (hit.class ?? "").toLowerCase();
  if (cls !== "place") return false;
  const typ = (hit.type ?? "").toLowerCase();
  return /city|town|village|municipality|suburb|hamlet|locality|county|region|state|province/.test(
    typ,
  );
}

/**
 * Nominatim is biased toward the GeoHub point — a province-wide name search can
 * still return a high-importance result far away (e.g. Ottawa) even when the
 * stocking data references another part of the province. Keep a tight radius.
 */
const MAX_CANDIDATE_M = 90_000;
const MAX_REFINEMENT_M = 50_000;

function dedupeHits(hits: NominatimHit[]): NominatimHit[] {
  const seen = new Set<string>();
  const out: NominatimHit[] = [];
  for (const h of hits) {
    const lat = Number.parseFloat(h.lat);
    const lng = Number.parseFloat(h.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const key = `${lat.toFixed(5)}:${lng.toFixed(5)}:${h.class ?? ""}:${h.type ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}

/** In-memory cache to respect Nominatim load (same lake queried often). */
const cache = new Map<string, { lat: number; lng: number; at: number }>();
const CACHE_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE = 800;

function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

function scoreHit(
  hit: NominatimHit,
  hintLat: number,
  hintLng: number,
  lakeLike: boolean,
): number | null {
  const lat = Number.parseFloat(hit.lat);
  const lng = Number.parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const d = haversineM(hintLat, hintLng, lat, lng);
  if (d > MAX_CANDIDATE_M) return null;
  if (isPopulationCenterPlace(hit)) return null;

  if (lakeLike && isStreamRiverWaterway(hit)) {
    return null;
  }
  if (lakeLike && isUnwantedLandPoi(hit)) {
    return null;
  }

  const cls = (hit.class ?? "").toLowerCase();
  const typ = (hit.type ?? "").toLowerCase();
  let w = 0;
  if (cls === "water") w += 80;
  else if (cls === "natural" && (typ.includes("water") || typ.includes("lake"))) w += 70;
  else if (cls === "natural") w += 28;
  if (
    typ.includes("lake") ||
    (typ.includes("water") && !typ.includes("way")) ||
    typ.includes("bay") ||
    typ.includes("reservoir") ||
    typ.includes("pond")
  ) {
    w += 45;
  }
  if (typ.includes("administrative") || typ.includes("boundary")) w -= 60;
  if (typ.includes("house") || typ.includes("building")) w -= 120;
  const imp = hit.importance ?? 0;
  w += Math.min(imp * 3, 25);
  w -= d / 8000;
  return w;
}

/** Score OSM water polygons — distance penalty is mild so a real lake km away beats a road at the hint. */
function scoreWaterbodyCandidate(
  hit: NominatimHit,
  hintLat: number,
  hintLng: number,
): number | null {
  const lat = Number.parseFloat(hit.lat);
  const lng = Number.parseFloat(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const d = haversineM(hintLat, hintLng, lat, lng);
  if (d > MAX_CANDIDATE_M) return null;
  if (isPopulationCenterPlace(hit)) return null;

  const cls = (hit.class ?? "").toLowerCase();
  const typ = (hit.type ?? "").toLowerCase();
  let w = 130;
  if (cls === "water") w += 25;
  if (
    typ.includes("lake") ||
    typ.includes("pond") ||
    typ.includes("bay") ||
    typ.includes("reservoir")
  ) {
    w += 40;
  }
  const imp = hit.importance ?? 0;
  w += Math.min(imp * 4, 40);
  w -= d / 28_000;
  return w;
}

function pickLakePin(
  data: NominatimHit[],
  hintLat: number,
  hintLng: number,
  lakeLike: boolean,
): { lat: number; lng: number } | null {
  if (data.length === 0) return null;

  if (lakeLike) {
    const wb = data.filter(isWaterbodyPolygonHit);
    if (wb.length > 0) {
      let best: { lat: number; lng: number; score: number } | null = null;
      for (const h of wb) {
        const lat = Number.parseFloat(h.lat);
        const lng = Number.parseFloat(h.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const s = scoreWaterbodyCandidate(h, hintLat, hintLng);
        if (s === null) continue;
        if (!best || s > best.score) {
          best = { lat, lng, score: s };
        }
      }
      if (best) {
        return { lat: best.lat, lng: best.lng };
      }
    }
  }

  let best: { lat: number; lng: number; score: number } | null = null;
  for (const h of data) {
    const lat = Number.parseFloat(h.lat);
    const lng = Number.parseFloat(h.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const s = scoreHit(h, hintLat, hintLng, lakeLike);
    if (s === null) continue;
    if (!best || s > best.score) {
      best = { lat, lng, score: s };
    }
  }
  if (best) {
    return { lat: best.lat, lng: best.lng };
  }

  let fallback: { lat: number; lng: number; d: number } | null = null;
  for (const h of data) {
    const lat = Number.parseFloat(h.lat);
    const lng = Number.parseFloat(h.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lakeLike && isStreamRiverWaterway(h)) continue;
    if (lakeLike && isUnwantedLandPoi(h)) continue;
    const d = haversineM(hintLat, hintLng, lat, lng);
    if (d > MAX_CANDIDATE_M) continue;
    if (isPopulationCenterPlace(h)) continue;
    if (!fallback || d < fallback.d) {
      fallback = { lat, lng, d };
    }
  }
  if (fallback) {
    return { lat: fallback.lat, lng: fallback.lng };
  }
  return null;
}

async function fetchNominatim(
  params: URLSearchParams,
): Promise<NominatimHit[]> {
  const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
      "Accept-Language": "en",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as unknown;
  return Array.isArray(data) ? data : [];
}

export async function GET(req: NextRequest) {
  const qRaw = req.nextUrl.searchParams.get("q")?.trim();
  const latS = req.nextUrl.searchParams.get("lat");
  const lngS = req.nextUrl.searchParams.get("lng");
  if (!qRaw || !latS || !lngS) {
    return NextResponse.json({ error: "q, lat, lng required" }, { status: 400 });
  }
  const hintLat = Number.parseFloat(latS);
  const hintLng = Number.parseFloat(lngS);
  if (!Number.isFinite(hintLat) || !Number.isFinite(hintLng)) {
    return NextResponse.json({ error: "invalid lat/lng" }, { status: 400 });
  }

  const lakeLike = isLakeLikeQuery(qRaw);
  const cacheKey = `v${CACHE_VERSION}|${qRaw}|${hintLat.toFixed(5)}|${hintLng.toFixed(5)}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < CACHE_MS) {
    return NextResponse.json({ lat: hit.lat, lng: hit.lng, cached: true });
  }

  const q = `${qRaw}, Ontario, Canada`;
  const padTight = 0.4;
  const viewboxTight = [
    hintLng - padTight,
    hintLat + padTight,
    hintLng + padTight,
    hintLat - padTight,
  ].join(",");

  const base = new URLSearchParams({
    format: "json",
    q,
    limit: "25",
    addressdetails: "0",
    countrycodes: "ca",
  });

  try {
    const nearHint = new URLSearchParams(base);
    nearHint.set("viewbox", viewboxTight);
    nearHint.set("bounded", "0");

    let merged = await fetchNominatim(nearHint);
    if (lakeLike && !merged.some(isWaterbodyPolygonHit)) {
      const padLoose = 1.25;
      const viewboxLoose = [
        hintLng - padLoose,
        hintLat + padLoose,
        hintLng + padLoose,
        hintLat - padLoose,
      ].join(",");
      const second = new URLSearchParams(base);
      second.set("viewbox", viewboxLoose);
      second.set("bounded", "0");
      second.set("limit", "40");
      const extra = await fetchNominatim(second);
      merged = dedupeHits([...merged, ...extra]);
    }

    if (merged.length === 0) {
      return NextResponse.json({ notFound: true }, { status: 200 });
    }

    const picked = pickLakePin(merged, hintLat, hintLng, lakeLike);
    if (!picked) {
      return NextResponse.json({ notFound: true }, { status: 200 });
    }

    const dRefine = haversineM(hintLat, hintLng, picked.lat, picked.lng);
    if (dRefine > MAX_REFINEMENT_M) {
      return NextResponse.json({ notFound: true }, { status: 200 });
    }

    if (cache.size >= MAX_CACHE) {
      const first = cache.keys().next().value;
      if (first) cache.delete(first);
    }
    cache.set(cacheKey, { lat: picked.lat, lng: picked.lng, at: now });

    return NextResponse.json({ lat: picked.lat, lng: picked.lng, cached: false });
  } catch {
    return NextResponse.json({ notFound: true, reason: "fetch failed" }, { status: 200 });
  }
}
