import { NextResponse } from "next/server";
import type { GeocodeSearchHit } from "@/lib/geocode-search-types";

const GEO = "https://geocoding-api.open-meteo.com/v1/search";

/** Proxies Open-Meteo geocoding (no API key). Validates query length to limit abuse. */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const lang = searchParams.get("lang") === "fr" ? "fr" : "en";

  if (q.length < 2) {
    return NextResponse.json({ results: [] as GeocodeSearchHit[] });
  }
  if (q.length > 120) {
    return NextResponse.json(
      { error: "Query too long." },
      { status: 400 },
    );
  }

  const url = new URL(GEO);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", lang);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoding service unavailable." },
        { status: 502 },
      );
    }
    const raw = (await res.json()) as {
      results?: {
        id: number;
        name: string;
        latitude: number;
        longitude: number;
        country?: string;
        admin1?: string | null;
      }[];
    };

    const results: GeocodeSearchHit[] = (raw.results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country ?? "",
      admin1: r.admin1 ?? null,
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Geocoding service unreachable." },
      { status: 502 },
    );
  }
}
