import type { FishingForecastPayload } from "@/lib/fishing-forecast-types";
import type { MoonPhaseKey } from "@/lib/solunar";

export type ConditionStars = 1 | 2 | 3 | 4 | 5;

/** "good" | "fair" | "poor" coloring based on absolute MSL pressure (hPa). */
export type PressureQuality = "good" | "fair" | "poor" | "unknown";

export function pressureQualityFromHpa(hpa: number | null): PressureQuality {
  if (hpa == null || !Number.isFinite(hpa)) return "unknown";
  if (hpa >= 1018) return "good";
  if (hpa >= 1005) return "fair";
  return "poor";
}

/** Solunar bonus: full and new moons typically produce stronger feeding peaks. */
function moonPhaseBonus(phaseKey: MoonPhaseKey): number {
  switch (phaseKey) {
    case "full":
    case "new":
      return 0.55;
    case "waxing_gibbous":
    case "waning_gibbous":
      return 0.25;
    case "first_quarter":
    case "last_quarter":
      return 0.0;
    default:
      return 0.1;
  }
}

/**
 * Heuristic same-day “conditions” score from pressure trend + level, solunar windows,
 * moon phase, and cloud cover. Informational only — not a guarantee of fishing success.
 */
export function computeConditionStars(
  data: FishingForecastPayload,
): ConditionStars {
  let score = 2.75;

  switch (data.pressureTrend) {
    case "falling":
      score += 0.85;
      break;
    case "steady":
      score += 0.35;
      break;
    case "rising":
      score -= 0.5;
      break;
    default:
      break;
  }

  const lastQuality = pressureQualityFromHpa(data.pressureHpaLast);
  if (lastQuality === "good") score += 0.3;
  else if (lastQuality === "poor") score -= 0.3;

  const majors = data.biteWindows.filter((w) => w.kind === "major").length;
  const minors = data.biteWindows.filter((w) => w.kind === "minor").length;
  score += Math.min(1.05, majors * 0.32 + minors * 0.12);

  score += moonPhaseBonus(data.sunMoon.moonPhaseKey);

  const clouds = data.hourly.cloudCover.filter(
    (c): c is number => c != null && Number.isFinite(c),
  );
  if (clouds.length > 0) {
    const avg = clouds.reduce((a, b) => a + b, 0) / clouds.length;
    if (avg < 38) score += 0.35;
    else if (avg > 82) score -= 0.45;
  }

  return Math.round(Math.max(1, Math.min(5, score))) as ConditionStars;
}
