import type { BiteWindow } from "@/lib/solunar";

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
  };
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
