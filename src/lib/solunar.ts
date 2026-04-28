import SunCalc from "suncalc";
import { fromZonedTime } from "date-fns-tz";

export type BiteWindow = {
  start: string;
  end: string;
  kind: "major" | "minor";
};

/** Half-width of each bite window (major/minor), in ms — total window = 2 × this (±1 h). */
const WINDOW_HALF_MS = 60 * 60 * 1000;

/**
 * Solunar-style bite windows (major ≈ moon overhead / underfoot, minor ≈ moonrise / set).
 * Same general idea as common solunar calendars; times are approximations.
 */
export function computeSolunarForDay(
  dateStr: string,
  timeZone: string,
  lat: number,
  lon: number,
): BiteWindow[] {
  const dayStart = fromZonedTime(`${dateStr} 00:00:00`, timeZone);
  const dayEnd = fromZonedTime(`${dateStr} 23:59:59`, timeZone);

  let maxAlt = -99;
  let transitAt: Date | null = null;
  for (let t = dayStart.getTime(); t <= dayEnd.getTime(); t += 5 * 60 * 1000) {
    const d = new Date(t);
    const alt = SunCalc.getMoonPosition(d, lat, lon).altitude;
    if (alt > maxAlt) {
      maxAlt = alt;
      transitAt = d;
    }
  }

  const underfootAt =
    transitAt != null
      ? new Date(transitAt.getTime() + 12.25 * 60 * 60 * 1000)
      : null;

  const noon = new Date(dayStart.getTime() + 12 * 60 * 60 * 1000);
  const moonTimes = SunCalc.getMoonTimes(noon, lat, lon);

  const raw: { start: Date; end: Date; kind: "major" | "minor" }[] = [];

  if (transitAt != null && maxAlt > -0.02) {
    raw.push({
      start: new Date(transitAt.getTime() - WINDOW_HALF_MS),
      end: new Date(transitAt.getTime() + WINDOW_HALF_MS),
      kind: "major",
    });
  }
  if (underfootAt != null) {
    raw.push({
      start: new Date(underfootAt.getTime() - WINDOW_HALF_MS),
      end: new Date(underfootAt.getTime() + WINDOW_HALF_MS),
      kind: "major",
    });
  }
  if (moonTimes.rise) {
    raw.push({
      start: new Date(moonTimes.rise.getTime() - WINDOW_HALF_MS),
      end: new Date(moonTimes.rise.getTime() + WINDOW_HALF_MS),
      kind: "minor",
    });
  }
  if (moonTimes.set) {
    raw.push({
      start: new Date(moonTimes.set.getTime() - WINDOW_HALF_MS),
      end: new Date(moonTimes.set.getTime() + WINDOW_HALF_MS),
      kind: "minor",
    });
  }

  const windows: BiteWindow[] = raw.map((w) => ({
    start: w.start.toISOString(),
    end: w.end.toISOString(),
    kind: w.kind,
  }));

  windows.sort((a, b) => a.start.localeCompare(b.start));
  return windows;
}

export type MoonPhaseKey =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

/** SunCalc phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
function moonPhaseKeyFromValue(phase: number): MoonPhaseKey {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.03 || p >= 0.97) return "new";
  if (p < 0.22) return "waxing_crescent";
  if (p < 0.28) return "first_quarter";
  if (p < 0.47) return "waxing_gibbous";
  if (p < 0.53) return "full";
  if (p < 0.72) return "waning_gibbous";
  if (p < 0.78) return "last_quarter";
  return "waning_crescent";
}

export function sunMoonSummary(
  dateStr: string,
  timeZone: string,
  lat: number,
  lon: number,
): {
  sunrise: string | null;
  sunset: string | null;
  moonrise: string | null;
  moonset: string | null;
  moonPhase: number;
  moonPhaseKey: MoonPhaseKey;
  moonIllumination: number;
} {
  const noon = fromZonedTime(`${dateStr} 12:00:00`, timeZone);
  const sun = SunCalc.getTimes(noon, lat, lon);
  const moon = SunCalc.getMoonTimes(noon, lat, lon);
  const ill = SunCalc.getMoonIllumination(noon);
  return {
    sunrise: sun.sunrise ? sun.sunrise.toISOString() : null,
    sunset: sun.sunset ? sun.sunset.toISOString() : null,
    moonrise: moon.rise ? moon.rise.toISOString() : null,
    moonset: moon.set ? moon.set.toISOString() : null,
    moonPhase: ill.phase,
    moonPhaseKey: moonPhaseKeyFromValue(ill.phase),
    moonIllumination: ill.fraction,
  };
}
