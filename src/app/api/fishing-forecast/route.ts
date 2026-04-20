import { NextResponse } from "next/server";
import { MAX_FORECAST_DAYS_AHEAD } from "@/lib/fishing-forecast-constants";
import type { FishingForecastPayload } from "@/lib/fishing-forecast-types";
import { computeSolunarForDay, sunMoonSummary } from "@/lib/solunar";

/** Server-side proxy to Open-Meteo + local solunar math. Validates inputs; no API keys. */

export const revalidate = 900;

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

function daysFromTodayUtc(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const startToday = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Math.round((target - startToday) / (24 * 60 * 60 * 1000));
}

function parseDate(s: string | null): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return s;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  const date = parseDate(searchParams.get("date"));

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return NextResponse.json({ error: "Invalid latitude." }, { status: 400 });
  }
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid longitude." }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json(
      { error: "Invalid or missing date (use YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const offsetDays = daysFromTodayUtc(date);
  if (offsetDays > MAX_FORECAST_DAYS_AHEAD) {
    return NextResponse.json(
      { code: "DATE_UNAVAILABLE" as const },
      { status: 422 },
    );
  }

  const omUrl = new URL(OPEN_METEO);
  omUrl.searchParams.set("latitude", String(lat));
  omUrl.searchParams.set("longitude", String(lon));
  omUrl.searchParams.set("hourly", "pressure_msl,cloud_cover");
  omUrl.searchParams.set("timezone", "auto");
  omUrl.searchParams.set("start_date", date);
  omUrl.searchParams.set("end_date", date);

  let omJson: {
    timezone?: string;
    utc_offset_seconds?: number;
    hourly?: {
      time?: string[];
      pressure_msl?: (number | null)[];
      cloud_cover?: (number | null)[];
    };
  };

  try {
    const omRes = await fetch(omUrl.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!omRes.ok) {
      const raw = await omRes.text();
      let reason = "";
      try {
        const errBody = JSON.parse(raw) as { reason?: string; error?: boolean };
        if (typeof errBody.reason === "string") reason = errBody.reason;
      } catch {
        // ignore
      }
      const reasonLc = reason.toLowerCase();
      const looksLikeDateRange =
        omRes.status === 400 ||
        /\b(date|range|start_date|end_date|forecast|available|future)\b/i.test(
          reason,
        );
      if (looksLikeDateRange) {
        return NextResponse.json(
          { code: "DATE_UNAVAILABLE" as const },
          { status: 422 },
        );
      }
      return NextResponse.json(
        { error: reason || "Weather service unavailable." },
        { status: 502 },
      );
    }
    omJson = (await omRes.json()) as typeof omJson;
  } catch {
    return NextResponse.json(
      { error: "Weather service unreachable." },
      { status: 502 },
    );
  }

  const timeZone = omJson.timezone ?? "UTC";
  const utcOffsetSeconds = omJson.utc_offset_seconds ?? 0;
  const times = omJson.hourly?.time ?? [];
  const pressure = omJson.hourly?.pressure_msl ?? [];
  const cloud = omJson.hourly?.cloud_cover ?? [];

  if (times.length === 0 && pressure.length === 0) {
    return NextResponse.json(
      { code: "DATE_UNAVAILABLE" as const },
      { status: 422 },
    );
  }

  const valid = pressure.filter((p): p is number => p != null && Number.isFinite(p));
  let pressureTrend: FishingForecastPayload["pressureTrend"] = "unknown";
  let pressureHpaFirst: number | null = null;
  let pressureHpaLast: number | null = null;
  if (valid.length >= 2) {
    pressureHpaFirst = valid[0]!;
    pressureHpaLast = valid[valid.length - 1]!;
    const delta = pressureHpaLast - pressureHpaFirst;
    if (delta > 0.5) pressureTrend = "rising";
    else if (delta < -0.5) pressureTrend = "falling";
    else pressureTrend = "steady";
  } else if (valid.length === 1) {
    pressureHpaFirst = valid[0]!;
    pressureHpaLast = valid[0]!;
  }

  const biteWindows = computeSolunarForDay(date, timeZone, lat, lon);
  const sunMoon = sunMoonSummary(date, timeZone, lat, lon);

  const payload: FishingForecastPayload = {
    date,
    timezone: timeZone,
    utcOffsetSeconds,
    latitude: lat,
    longitude: lon,
    hourly: {
      time: times,
      pressureMsl: pressure,
      cloudCover: cloud,
    },
    pressureTrend,
    pressureHpaFirst,
    pressureHpaLast,
    biteWindows,
    sunMoon,
    attribution: {
      weather:
        "Weather data by Open-Meteo (CC BY 4.0). https://open-meteo.com/",
      solunar:
        "Solunar windows are calculated on FishList from sun and moon positions (classic solunar-style periods).",
    },
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}
