import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Ontario Aquatic Resource Areas (polygons) — public FeatureServer.
 * FISH_SPECIES_SUMMARY is comma-separated species (MNRF / LIO).
 * @see https://data.ontario.ca/dataset/aquatic-resource-areas-ara
 */
const ARA_LAYER =
  "https://services9.arcgis.com/ag2wwtyf46VUeRb3/arcgis/rest/services/ARA___Polygon_January2022/FeatureServer/0/query";

const PAGE = 2000;
const MAX_TOTAL = 5000;
/** Reject very wide views to avoid biasing a random 2k page of data. */
const MAX_SPAN_DEG = 2.25;

/** Esri JSON: each polygon is an array of linear rings; each ring is a list of [lng, lat] pairs. */
type EsriPolygon = { rings: number[][][] };

function ringCentroid(ring: number[][]): { lat: number; lng: number } | null {
  if (ring.length < 3) return null;
  let slng = 0;
  let slat = 0;
  for (const pt of ring) {
    if (pt.length < 2) continue;
    slng += pt[0];
    slat += pt[1];
  }
  const n = ring.length;
  if (n === 0) return null;
  return { lng: slng / n, lat: slat / n };
}

function geometryCentroid(geometry: EsriPolygon): { lat: number; lng: number } | null {
  if (!geometry?.rings?.length) return null;
  return ringCentroid(geometry.rings[0]);
}

const SPECIES_SQL_LIKE: Record<string, string[]> = {
  smallmouth_bass: ["Smallmouth Bass"],
  largemouth_bass: ["Largemouth Bass"],
  rock_bass: ["Rock Bass"],
  northern_pike: ["Northern Pike"],
  walleye: ["Walleye", "Yellow Pickerel"],
  muskellunge: ["Muskellunge", "Muskie"],
  yellow_perch: ["Yellow Perch"],
  brook_trout: ["Brook Trout"],
  lake_trout: ["Lake Trout"],
  rainbow_trout: ["Rainbow Trout"],
  brown_trout: ["Brown Trout"],
  black_crappie: ["Black Crappie"],
};

function buildWhere(speciesKeys: string[]): string {
  const parts: string[] = [];
  for (const key of speciesKeys) {
    const names = SPECIES_SQL_LIKE[key];
    if (!names || names.length === 0) continue;
    const clause = names
      .map((name) => `FISH_SPECIES_SUMMARY LIKE '%${name.replace(/'/g, "''")}%'`)
      .join(" OR ");
    parts.push(`(${clause})`);
  }
  if (parts.length === 0) {
    return "1=0";
  }
  return `FISH_SPECIES_SUMMARY IS NOT NULL AND (${parts.join(" OR ")})`;
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const south = Number.parseFloat(p.get("south") ?? "");
  const west = Number.parseFloat(p.get("west") ?? "");
  const north = Number.parseFloat(p.get("north") ?? "");
  const east = Number.parseFloat(p.get("east") ?? "");
  if (
    !Number.isFinite(south) ||
    !Number.isFinite(west) ||
    !Number.isFinite(north) ||
    !Number.isFinite(east) ||
    south >= north ||
    west >= east
  ) {
    return NextResponse.json(
      { error: "valid south, west, north, east required" },
      { status: 400 },
    );
  }

  const latSpan = north - south;
  const lngSpan = east - west;
  if (Math.max(latSpan, lngSpan) > MAX_SPAN_DEG) {
    return NextResponse.json(
      { features: [], tooWide: true, maxSpanDeg: MAX_SPAN_DEG },
      { status: 200 },
    );
  }

  const species = (p.get("species") ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const where = buildWhere(species);

  const geometry = {
    xmin: west,
    ymin: south,
    xmax: east,
    ymax: north,
    spatialReference: { wkid: 4326 },
  };

  const base = new URLSearchParams({
    f: "json",
    where,
    returnGeometry: "true",
    outFields: "OBJECTID,OFFICIAL_WATERBODY_NAME,FISH_SPECIES_SUMMARY",
    outSR: "4326",
    inSR: "4326",
    geometry: JSON.stringify(geometry),
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
  });

  const all: {
    id: number;
    name: string;
    species: string;
    lat: number;
    lng: number;
  }[] = [];

  try {
    let offset = 0;
    let hasMore = true;
    while (hasMore && all.length < MAX_TOTAL) {
      const params = new URLSearchParams(base);
      params.set("resultRecordCount", String(PAGE));
      params.set("resultOffset", String(offset));

      const res = await fetch(`${ARA_LAYER}?${params.toString()}`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 0 },
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: "GeoHub request failed", status: res.status },
          { status: 502 },
        );
      }
      const data = (await res.json()) as {
        features?: { attributes: Record<string, unknown>; geometry: EsriPolygon }[];
        exceededTransferLimit?: boolean;
        error?: { message?: string };
      };
      if (data.error) {
        return NextResponse.json(
          { error: data.error.message ?? "GeoHub error" },
          { status: 502 },
        );
      }
      const feats = data.features ?? [];
      for (const f of feats) {
        const a = f.attributes;
        const id = a.OBJECTID;
        if (typeof id !== "number") continue;
        const c = geometryCentroid(f.geometry);
        if (!c) continue;
        all.push({
          id,
          name: String(a.OFFICIAL_WATERBODY_NAME ?? "—"),
          species: String(a.FISH_SPECIES_SUMMARY ?? ""),
          lat: c.lat,
          lng: c.lng,
        });
      }
      hasMore =
        data.exceededTransferLimit === true && feats.length === PAGE;
      offset += PAGE;
    }

    return NextResponse.json({
      features: all,
      tooWide: false,
      maxSpanDeg: MAX_SPAN_DEG,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load ARA data" },
      { status: 502 },
    );
  }
}
