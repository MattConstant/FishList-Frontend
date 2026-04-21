import type { BiteWindow } from "@/lib/solunar";

/** Aggregates from hourly series for the selected calendar day (fishing-relevant context). */
export type FishingDayWeatherSummary = {
  tempMinC: number | null;
  tempMaxC: number | null;
  humidityAvgPct: number | null;
  /** Sum of hourly precipitation (mm) for the day. */
  precipMmSum: number;
  /** Maximum hourly wind speed at 10 m (km/h). */
  windSpeedMaxKmh: number | null;
  /** Wind direction (°) at the hour of maximum wind speed. */
  windDirectionAtMaxDeg: number | null;
  /** Mean cloud cover (%) for the day. */
  cloudCoverAvgPct: number | null;
};

export type FishingForecastPayload = {
  date: string;
  timezone: string;
  utcOffsetSeconds: number;
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    pressureMsl: (number | null)[];
    cloudCover: (number | null)[];
    temperature2m: (number | null)[];
    relativeHumidity2m: (number | null)[];
    precipitation: (number | null)[];
    windSpeed10m: (number | null)[];
    windDirection10m: (number | null)[];
  };
  daySummary: FishingDayWeatherSummary;
  pressureTrend: "rising" | "falling" | "steady" | "unknown";
  pressureHpaFirst: number | null;
  pressureHpaLast: number | null;
  biteWindows: BiteWindow[];
  sunMoon: {
    sunrise: string | null;
    sunset: string | null;
    moonrise: string | null;
    moonset: string | null;
  };
  attribution: {
    weather: string;
    solunar: string;
  };
};
