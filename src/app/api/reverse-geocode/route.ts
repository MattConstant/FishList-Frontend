import { NextResponse } from "next/server";

export const runtime = "nodejs";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT =
  "FishList/1.0 (https://github.com; map area label, contact via site)";

type NominatimAddress = {
  lake?: string;
  pond?: string;
  reservoir?: string;
  water?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  country?: string;
};

type NominatimReverse = {
  display_name?: string;
  name?: string;
  class?: string;
  type?: string;
  address?: NominatimAddress;
};

/**
 * Only water polygons (lakes, ponds, wide rivers). The natural layer's nearest feature
 * can also be a creek, canal route, wood, or peak when the point is on land - taking
 * those would prefill "Bunker's Creek" for a click in downtown Barrie.
 */
function isWaterFeature(cls: string, typ: string): boolean {
  if (cls === "water") return true;
  if (cls === "natural") return /water|bay|strait/.test(typ);
  return false;
}

function waterNameFrom(data: NominatimReverse, addr: NominatimAddress): string | null {
  const featureName = (data.name ?? "").trim();
  const cls = (data.class ?? "").toLowerCase();
  const typ = (data.type ?? "").toLowerCase();
  if (featureName && isWaterFeature(cls, typ)) return featureName;
  const addrWater = addr.lake || addr.pond || addr.reservoir || addr.water;
  return addrWater?.trim() || null;
}

function labelFromAddress(a: NominatimAddress, displayName: string | undefined): string {
  const water =
    a.lake || a.pond || a.reservoir || a.water;
  const settlement =
    a.hamlet ||
    a.village ||
    a.town ||
    a.city ||
    a.municipality;
  const region = a.state || a.region || a.county;

  const parts: string[] = [];
  if (water) parts.push(water);
  if (settlement && settlement !== water) parts.push(settlement);
  if (parts.length === 0 && region) parts.push(region);
  if (parts.length === 0 && displayName) {
    return displayName.split(",").slice(0, 3).join(",").trim();
  }
  if (parts.length === 0) return "Selected area";

  const tail = region && !parts.includes(region) ? ` · ${region}` : "";
  return (parts.join(" · ") + tail).slice(0, 140);
}

async function reverseLookup(
  lat: number,
  lon: number,
  opts: { zoom: string; layer?: string },
): Promise<NominatimReverse | null> {
  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", opts.zoom);
  if (opts.layer) url.searchParams.set("layer", opts.layer);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) return null;
  return (await res.json()) as NominatimReverse;
}

/**
 * Reverse geocode for the map picker. Default: short area label (zoom 12) for the bottom
 * sheet title. mode=water queries the natural layer, where a click inside a lake polygon
 * returns that waterbody; the response gains a `water` field with its name (null on land).
 * Nominatim only returns water features when asked for layer=natural - the default
 * address layer answers with the containing town, no matter how far out on the lake.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const wantWater = searchParams.get("mode") === "water";

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Out of range." }, { status: 400 });
  }

  try {
    if (wantWater) {
      const natural = await reverseLookup(lat, lon, { zoom: "18", layer: "natural" });
      const water = natural ? waterNameFrom(natural, natural.address ?? {}) : null;
      if (water) {
        return NextResponse.json({ label: water, water });
      }
      // Point is on land (or the nearest natural feature isn't water): fall back to the
      // regular area label so the caller still gets something useful to prefill.
      const area = await reverseLookup(lat, lon, { zoom: "12" });
      if (!area) {
        return NextResponse.json({ error: "Geocoder unavailable." }, { status: 502 });
      }
      const label = labelFromAddress(area.address ?? {}, area.display_name || undefined);
      return NextResponse.json({ label, water: null });
    }

    const data = await reverseLookup(lat, lon, { zoom: "12" });
    if (!data) {
      return NextResponse.json({ error: "Geocoder unavailable." }, { status: 502 });
    }
    const label = labelFromAddress(data.address ?? {}, data.display_name || undefined);
    return NextResponse.json({ label });
  } catch {
    return NextResponse.json(
      { error: "Geocoder unreachable." },
      { status: 502 },
    );
  }
}
