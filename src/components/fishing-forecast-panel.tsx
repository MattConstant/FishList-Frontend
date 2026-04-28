"use client";

import { useMemo } from "react";
import { FishingConditionStars } from "@/components/fishing-condition-stars";
import { FishingPressureChart } from "@/components/fishing-pressure-chart";
import { useLocale } from "@/contexts/locale-context";
import {
  computeConditionStars,
  pressureQualityFromHpa,
  type PressureQuality,
} from "@/lib/fishing-forecast-rating";
import type { FishingForecastPayload } from "@/lib/fishing-forecast-types";
import type { MoonPhaseKey } from "@/lib/solunar";

const FORECAST_RATING_LEVEL_KEYS = [
  "forecast.rating.level.1",
  "forecast.rating.level.2",
  "forecast.rating.level.3",
  "forecast.rating.level.4",
  "forecast.rating.level.5",
] as const;

const TREND_PILL_CLASS: Record<
  FishingForecastPayload["pressureTrend"],
  string
> = {
  falling:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  rising:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-300",
  steady:
    "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700/70 dark:bg-sky-950/40 dark:text-sky-300",
  unknown:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
};

const PRESSURE_QUALITY_CLASS: Record<PressureQuality, string> = {
  good:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  fair:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-300",
  poor:
    "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700/70 dark:bg-rose-950/40 dark:text-rose-300",
  unknown:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-300",
};

const MOON_PHASE_GLYPH: Record<MoonPhaseKey, string> = {
  new: "🌑",
  waxing_crescent: "🌒",
  first_quarter: "🌓",
  waxing_gibbous: "🌔",
  full: "🌕",
  waning_gibbous: "🌖",
  last_quarter: "🌗",
  waning_crescent: "🌘",
};

function formatTime(
  iso: string,
  timeZone: string,
  intlLocale: string,
): string {
  try {
    return new Intl.DateTimeFormat(intlLocale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

/** 8-point compass from meteorological degrees (0 = N, clockwise). */
function windCardinal8(deg: number): string {
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return labels[i] ?? "";
}

type Props = {
  data: FishingForecastPayload;
  /** Tighter layout for the map popup. */
  compact?: boolean;
};

export function FishingForecastPanel({ data, compact }: Props) {
  const { t, locale } = useLocale();
  const intlLocale = locale === "fr" ? "fr-CA" : "en-CA";

  const trendLabel = useMemo(() => {
    const k = `forecast.trend.${data.pressureTrend}` as const;
    return t(k);
  }, [data, t]);

  const conditionStars = useMemo(
    () => computeConditionStars(data),
    [data],
  );

  const pressureQualityLast = useMemo(
    () => pressureQualityFromHpa(data.pressureHpaLast),
    [data.pressureHpaLast],
  );
  const pressureQualityLabelKey =
    `forecast.pressureQuality.${pressureQualityLast}` as const;
  const pressureQualityClass = PRESSURE_QUALITY_CLASS[pressureQualityLast];

  const trendPillClass = TREND_PILL_CLASS[data.pressureTrend];
  const moonPhaseLabelKey =
    `forecast.moonPhase.${data.sunMoon.moonPhaseKey}` as const;
  const moonIlluminationPct = Math.round(
    Math.max(0, Math.min(1, data.sunMoon.moonIllumination)) * 100,
  );

  const pressureRangeLabel = useMemo(() => {
    if (!data.hourly.pressureMsl.length) return null;
    const nums = data.hourly.pressureMsl.filter(
      (p): p is number => p != null && Number.isFinite(p),
    );
    if (nums.length === 0) return null;
    return {
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
  }, [data]);

  const ds = data.daySummary;
  const tempLine =
    ds.tempMinC != null && ds.tempMaxC != null
      ? t("forecast.tempRange", {
          min: ds.tempMinC.toFixed(1),
          max: ds.tempMaxC.toFixed(1),
        })
      : ds.tempMinC != null
        ? `${ds.tempMinC.toFixed(1)}°C`
        : ds.tempMaxC != null
          ? `${ds.tempMaxC.toFixed(1)}°C`
          : "—";

  const windLine =
    ds.windSpeedMaxKmh != null
      ? ds.windDirectionAtMaxDeg != null
        ? t("forecast.windDetail", {
            speed: ds.windSpeedMaxKmh.toFixed(1),
            cardinal: windCardinal8(ds.windDirectionAtMaxDeg),
            deg: String(ds.windDirectionAtMaxDeg),
          })
        : t("forecast.windSpeedOnly", {
            speed: ds.windSpeedMaxKmh.toFixed(1),
          })
      : "—";

  const section = compact
    ? "space-y-3"
    : "space-y-6 lg:space-y-8";
  const card = compact
    ? "rounded-xl border border-zinc-200/90 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
    : "rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 lg:p-6";

  return (
    <div className={section}>
      <p
        className={
          compact
            ? "text-[0.65rem] text-zinc-500 dark:text-zinc-400"
            : "text-xs text-zinc-500 dark:text-zinc-400"
        }
      >
        {t("forecast.timezone", { tz: data.timezone })}
      </p>

      <section
        className={
          compact
            ? "rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-3 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-zinc-900/50"
            : "rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:to-zinc-900/50 sm:p-6 lg:p-8"
        }
      >
        <div
          className={
            compact
              ? "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              : "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
          }
        >
          <div className="space-y-0.5 lg:max-w-2xl">
            <h2
              className={
                compact
                  ? "text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                  : "text-lg font-semibold text-zinc-900 lg:text-xl dark:text-zinc-50"
              }
            >
              {t("forecast.rating.title")}
            </h2>
            <p
              className={
                compact
                  ? "text-xs text-zinc-600 dark:text-zinc-400"
                  : "text-sm text-zinc-600 dark:text-zinc-400"
              }
            >
              {t("forecast.rating.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 lg:shrink-0">
            <FishingConditionStars
              value={conditionStars}
              ariaLabel={t("forecast.rating.aria", {
                stars: String(conditionStars),
                label: t(FORECAST_RATING_LEVEL_KEYS[conditionStars - 1]),
              })}
            />
            <p
              className={
                compact
                  ? "text-sm font-medium text-zinc-800 dark:text-zinc-100"
                  : "text-base font-medium text-zinc-800 dark:text-zinc-100 sm:text-lg"
              }
            >
              {t(FORECAST_RATING_LEVEL_KEYS[conditionStars - 1])}
            </p>
          </div>
        </div>
      </section>

      <section className={card}>
        <h2
          className={
            compact
              ? "text-sm font-semibold text-zinc-900 dark:text-zinc-50"
              : "text-lg font-semibold text-zinc-900 lg:text-xl dark:text-zinc-50"
          }
        >
          {t("forecast.weatherSummaryTitle")}
        </h2>
        <dl
          className={
            compact
              ? "mt-2 grid grid-cols-1 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-2"
              : "mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          <dt className="text-zinc-500">{t("forecast.tempRangeLabel")}</dt>
          <dd className="text-right font-mono text-zinc-900 dark:text-zinc-100">
            {tempLine}
          </dd>
          <dt className="text-zinc-500">{t("forecast.humidityAvg")}</dt>
          <dd className="text-right font-mono text-zinc-900 dark:text-zinc-100">
            {ds.humidityAvgPct != null
              ? `${ds.humidityAvgPct.toFixed(1)}%`
              : "—"}
          </dd>
          <dt className="text-zinc-500">{t("forecast.precipDay")}</dt>
          <dd className="text-right font-mono text-zinc-900 dark:text-zinc-100">
            {t("forecast.precipMm", { mm: ds.precipMmSum.toFixed(2) })}
          </dd>
          <dt className="text-zinc-500">{t("forecast.windMax")}</dt>
          <dd className="text-right font-mono text-zinc-900 dark:text-zinc-100">
            {windLine}
          </dd>
          <dt className="text-zinc-500">{t("forecast.cloudAvg")}</dt>
          <dd className="text-right font-mono text-zinc-900 dark:text-zinc-100">
            {ds.cloudCoverAvgPct != null
              ? `${ds.cloudCoverAvgPct.toFixed(0)}%`
              : "—"}
          </dd>
        </dl>
      </section>

      <section
        className={
          compact ? "grid gap-3 lg:grid-cols-3" : "grid gap-6 lg:gap-8 xl:grid-cols-3"
        }
      >
        <div className={compact ? `${card} lg:col-span-2` : `${card} xl:col-span-2`}>
          <h2
            className={
              compact
                ? "text-sm font-semibold text-zinc-900 dark:text-zinc-50"
                : "text-lg font-semibold text-zinc-900 lg:text-xl dark:text-zinc-50"
            }
          >
            {t("forecast.pressureTitle")}
          </h2>
          <div
            className={
              compact
                ? "mt-1 flex flex-wrap items-center gap-1.5"
                : "mt-2 flex flex-wrap items-center gap-2"
            }
          >
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                compact ? "text-[0.65rem]" : "text-xs",
                trendPillClass,
              ].join(" ")}
              title={t("forecast.pressureTrend")}
            >
              <span aria-hidden>
                {data.pressureTrend === "rising"
                  ? "↗"
                  : data.pressureTrend === "falling"
                    ? "↘"
                    : data.pressureTrend === "steady"
                      ? "→"
                      : "·"}
              </span>
              <span className="font-medium">{trendLabel}</span>
            </span>
            {pressureQualityLast !== "unknown" ? (
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium",
                  compact ? "text-[0.65rem]" : "text-xs",
                  pressureQualityClass,
                ].join(" ")}
                title={t("forecast.pressureQualityHint")}
              >
                {t(pressureQualityLabelKey)}
              </span>
            ) : null}
          </div>
          {data.pressureHpaFirst != null && data.pressureHpaLast != null && (
            <p
              className={
                compact
                  ? "mt-1 font-mono text-xs text-zinc-800 dark:text-zinc-200"
                  : "mt-2 font-mono text-sm text-zinc-800 dark:text-zinc-200"
              }
            >
              {t("forecast.pressureHpa", {
                first: data.pressureHpaFirst.toFixed(0),
                last: data.pressureHpaLast.toFixed(0),
              })}
            </p>
          )}
          <h3
            className={
              compact
                ? "mt-2 text-xs font-medium text-zinc-800 dark:text-zinc-200"
                : "mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200"
            }
          >
            {t("forecast.hourlyChart")}
          </h3>
          <div
            className={
              compact
                ? "mt-1.5 overflow-hidden rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-950/60"
                : "mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/60 lg:p-4"
            }
          >
            {pressureRangeLabel ? (
              <FishingPressureChart
                timeIso={data.hourly.time}
                pressureHpa={data.hourly.pressureMsl}
                timeZone={data.timezone}
                intlLocale={intlLocale}
                trend={data.pressureTrend}
                aria-label={t("forecast.chart.aria", {
                  min: pressureRangeLabel.min.toFixed(0),
                  max: pressureRangeLabel.max.toFixed(0),
                })}
              />
            ) : (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("forecast.trend.unknown")}
              </p>
            )}
          </div>
        </div>

        <div className={compact ? `${card} lg:col-span-1` : `${card} xl:col-span-1`}>
          <h2
            className={
              compact
                ? "text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
                : "text-lg font-semibold text-zinc-900 lg:text-xl dark:text-zinc-50"
            }
          >
            {t("forecast.solunarTitle")}
          </h2>
          <ul
            className={
              compact
                ? "mt-1.5 space-y-1 text-[0.6875rem] leading-snug"
                : "mt-3 space-y-2 text-sm"
            }
          >
            {data.biteWindows.map((w, i) => (
              <li
                key={`${w.kind}-${i}`}
                className={
                  compact
                    ? "flex items-center justify-between gap-1.5 rounded border border-zinc-200 bg-white px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-950/50"
                    : "flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50"
                }
              >
                <span
                  className={
                    w.kind === "major"
                      ? compact
                        ? "shrink-0 font-medium text-emerald-700 dark:text-emerald-400"
                        : "font-semibold text-emerald-700 dark:text-emerald-400"
                      : compact
                        ? "shrink-0 font-medium text-amber-800 dark:text-amber-300"
                        : "font-medium text-amber-800 dark:text-amber-300"
                  }
                >
                  {w.kind === "major" ? t("forecast.major") : t("forecast.minor")}
                </span>
                <span
                  className={
                    compact
                      ? "min-w-0 text-right font-mono text-[0.625rem] tabular-nums text-zinc-600 dark:text-zinc-400"
                      : "text-right font-mono text-[0.65rem] text-zinc-700 dark:text-zinc-300 sm:text-xs"
                  }
                >
                  {t("forecast.window", {
                    start: formatTime(w.start, data.timezone, intlLocale),
                    end: formatTime(w.end, data.timezone, intlLocale),
                  })}
                </span>
              </li>
            ))}
          </ul>
          <h3
            className={
              compact
                ? "mt-2.5 text-[0.6875rem] font-semibold text-zinc-900 dark:text-zinc-50"
                : "mt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
            }
          >
            {t("forecast.sunMoon")}
          </h3>
          <div
            className={
              compact
                ? "mt-1 flex items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-2 py-1 text-[0.6875rem] dark:border-zinc-700 dark:bg-zinc-950/50"
                : "mt-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950/50"
            }
            title={t("forecast.moonPhaseHint")}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={compact ? "text-base leading-none" : "text-xl leading-none"}
                aria-hidden
              >
                {MOON_PHASE_GLYPH[data.sunMoon.moonPhaseKey]}
              </span>
              <span className="min-w-0 truncate font-medium text-zinc-800 dark:text-zinc-100">
                {t(moonPhaseLabelKey)}
              </span>
            </span>
            <span className="font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
              {moonIlluminationPct}%
            </span>
          </div>
          <dl
            className={
              compact
                ? "mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[0.6875rem] leading-tight"
                : "mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm"
            }
          >
            <dt className="text-zinc-500">{t("forecast.sunrise")}</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">
              {data.sunMoon.sunrise
                ? formatTime(data.sunMoon.sunrise, data.timezone, intlLocale)
                : "—"}
            </dd>
            <dt className="text-zinc-500">{t("forecast.sunset")}</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">
              {data.sunMoon.sunset
                ? formatTime(data.sunMoon.sunset, data.timezone, intlLocale)
                : "—"}
            </dd>
            <dt className="text-zinc-500">{t("forecast.moonrise")}</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">
              {data.sunMoon.moonrise
                ? formatTime(data.sunMoon.moonrise, data.timezone, intlLocale)
                : t("forecast.noMoon")}
            </dd>
            <dt className="text-zinc-500">{t("forecast.moonset")}</dt>
            <dd className="text-right text-zinc-900 dark:text-zinc-100">
              {data.sunMoon.moonset
                ? formatTime(data.sunMoon.moonset, data.timezone, intlLocale)
                : t("forecast.noMoon")}
            </dd>
          </dl>
        </div>
      </section>

      <div
        className={
          compact
            ? "grid gap-3 border-t border-zinc-200/80 pt-3 dark:border-zinc-800"
            : "grid gap-6 border-t border-zinc-200/80 pt-6 dark:border-zinc-800 lg:grid-cols-2 lg:items-start"
        }
      >
        <p
          className={
            compact
              ? "text-[0.65rem] leading-relaxed text-zinc-500 dark:text-zinc-400"
              : "text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 lg:text-sm"
          }
        >
          {t("forecast.disclaimer")}
        </p>

        <section
          className={
            compact
              ? "rounded-lg border border-dashed border-zinc-300 bg-white/70 p-3 dark:border-zinc-700 dark:bg-zinc-950/40"
              : "rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-5 dark:border-zinc-700 dark:bg-zinc-950/40 lg:p-6"
          }
        >
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            {t("forecast.attributionTitle")}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            {data.attribution.weather}
          </p>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            {data.attribution.solunar}
          </p>
          <div className="mt-2">
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
            >
              {t("forecast.linkOpenMeteo")}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
