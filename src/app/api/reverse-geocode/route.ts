import { NextResponse } from "next/server";

export const runtime = "nodejs";

const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT =
  "FishList/1.0 (https://github.com; map area label — contact via site)";

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
  address?: NominatimAddress;
};

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

/** Reverse geocode for map picker — short label for the bottom sheet title. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Out of range." }, { status: 400 });
  }

  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "12");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoder unavailable." },
        { status: 502 },
      );
    }
    const data = (await res.json()) as NominatimReverse;
    const display = data.display_name ?? "";
    const addr = data.address ?? {};
    const label = labelFromAddress(addr, display || undefined);

    return NextResponse.json({ label });
  } catch {
    return NextResponse.json(
      { error: "Geocoder unreachable." },
      { status: 502 },
    );
  }
}
