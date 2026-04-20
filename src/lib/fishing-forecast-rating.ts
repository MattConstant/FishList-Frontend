import type { FishingForecastPayload } from "@/lib/fishing-forecast-types";

export type ConditionStars = 1 | 2 | 3 | 4 | 5;

/**
 * Heuristic same-day “conditions” score from pressure trend, solunar windows, and cloud cover.
 * Informational only — not a guarantee of fishing success.
 */
export function computeConditionStars(
  data: FishingForecastPayload,
): ConditionStars {
  let score = 2.75;

  switch (data.pressureTrend) {
    case "rising":
      score += 0.85;
      break;
    case "steady":
      score += 0.35;
      break;
    case "falling":
      score -= 0.5;
      break;
    default:
      break;
  }

  const majors = data.biteWindows.filter((w) => w.kind === "major").length;
  const minors = data.biteWindows.filter((w) => w.kind === "minor").length;
  score += Math.min(1.05, majors * 0.32 + minors * 0.12);

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
