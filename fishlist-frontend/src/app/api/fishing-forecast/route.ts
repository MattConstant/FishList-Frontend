import { NextResponse } from "next/server";
import { MAX_FORECAST_DAYS_AHEAD } from "@/lib/fishing-forecast-constants";
import type {
  FishingDayWeatherSummary,
  FishingForecastPayload,
} from "@/lib/fishing-forecast-types";
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

function summarizeDayFromHourly(
  _times: string[],
  temperature2m: (number | null)[],
  relativeHumidity2m: (number | null)[],
  precipitation: (number | null)[],
  windSpeed10m: (number | null)[],
  windDirection10m: (number | null)[],
  cloudCover: (number | null)[],
): FishingDayWeatherSummary {
  const n = Math.max(
    _times.length,
    temperature2m.length,
    relativeHumidity2m.length,
    precipitation.length,
    windSpeed10m.length,
    windDirection10m.length,
    cloudCover.length,
  );

  const temps: number[] = [];
  const humid: number[] = [];
  const clouds: number[] = [];
  let precipSum = 0;
  let windMax: number | null = null;
  let windDirAtMax: number | null = null;

  for (let i = 0; i < n; i++) {
    const t = temperature2m[i];
    if (t != null && Number.isFinite(t)) temps.push(t);

    const h = relativeHumidity2m[i];
    if (h != null && Number.isFinite(h)) humid.push(h);

    const c = cloudCover[i];
    if (c != null && Number.isFinite(c)) clouds.push(c);

    const pr = precipitation[i];
    if (pr != null && Number.isFinite(pr)) precipSum += pr;

    const ws = windSpeed10m[i];
    if (ws != null && Number.isFinite(ws)) {
      if (windMax === null || ws > windMax) {
        windMax = ws;
        const wd = windDirection10m[i];
        windDirAtMax = wd != null && Number.isFinite(wd) ? wd : null;
      }
    }
  }

  const tempMinC = temps.length ? Math.min(...temps) : null;
  const tempMaxC = temps.length ? Math.max(...temps) : null;
  const humidityAvgPct = humid.length
    ? humid.reduce((a, b) => a + b, 0) / humid.length
    : null;
  const cloudCoverAvgPct = clouds.length
    ? clouds.reduce((a, b) => a + b, 0) / clouds.length
    : null;

  return {
    tempMinC,
    tempMaxC,
    humidityAvgPct:
      humidityAvgPct != null ? Math.round(humidityAvgPct * 10) / 10 : null,
    precipMmSum: Math.round(precipSum * 100) / 100,
    windSpeedMaxKmh:
      windMax != null ? Math.round(windMax * 10) / 10 : null,
    windDirectionAtMaxDeg:
      windDirAtMax != null ? Math.round(windDirAtMax) : null,
    cloudCoverAvgPct:
      cloudCoverAvgPct != null ? Math.round(cloudCoverAvgPct * 10) / 10 : null,
  };
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
  omUrl.searchParams.set(
    "hourly",
    [
      "pressure_msl",
      "cloud_cover",
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
  );
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
      temperature_2m?: (number | null)[];
      relative_humidity_2m?: (number | null)[];
      precipitation?: (number | null)[];
      wind_speed_10m?: (number | null)[];
      wind_direction_10m?: (number | null)[];
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
  const temperature2m = omJson.hourly?.temperature_2m ?? [];
  const relativeHumidity2m = omJson.hourly?.relative_humidity_2m ?? [];
  const precipitation = omJson.hourly?.precipitation ?? [];
  const windSpeed10m = omJson.hourly?.wind_speed_10m ?? [];
  const windDirection10m = omJson.hourly?.wind_direction_10m ?? [];

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

  const daySummary = summarizeDayFromHourly(
    times,
    temperature2m,
    relativeHumidity2m,
    precipitation,
    windSpeed10m,
    windDirection10m,
    cloud,
  );

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
      temperature2m,
      relativeHumidity2m,
      precipitation,
      windSpeed10m,
      windDirection10m,
    },
    daySummary,
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
