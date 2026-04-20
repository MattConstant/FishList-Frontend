"use client";

import { useCallback, useMemo, useState } from "react";
import { FishingConditionStars } from "@/components/fishing-condition-stars";
import { FishingLocationSearch } from "@/components/fishing-location-search";
import { FishingPressureChart } from "@/components/fishing-pressure-chart";
import { useLocale } from "@/contexts/locale-context";
import { MAX_FORECAST_DAYS_AHEAD } from "@/lib/fishing-forecast-constants";
import { computeConditionStars } from "@/lib/fishing-forecast-rating";
import type { FishingForecastPayload } from "@/lib/fishing-forecast-types";

const FORECAST_RATING_LEVEL_KEYS = [
  "forecast.rating.level.1",
  "forecast.rating.level.2",
  "forecast.rating.level.3",
  "forecast.rating.level.4",
  "forecast.rating.level.5",
] as const;

const DEFAULT_LAT = 45.4215;
const DEFAULT_LON = -75.6972;

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Matches server — keeps the date picker in range. */
function maxForecastDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_FORECAST_DAYS_AHEAD);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(
  iso: string,
  timeZone: string,
  locale: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export default function FishingForecastPage() {
  const { t, locale } = useLocale();
  const intlLocale = locale === "fr" ? "fr-CA" : "en-CA";

  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FishingForecastPayload | null>(null);
  const [geoMsg, setGeoMsg] = useState("");

  const trendLabel = useMemo(() => {
    if (!data) return "";
    const k = `forecast.trend.${data.pressureTrend}` as const;
    return t(k);
  }, [data, t]);

  const conditionStars = useMemo(
    () => (data ? computeConditionStars(data) : null),
    [data],
  );

  const pressureRangeLabel = useMemo(() => {
    if (!data?.hourly.pressureMsl.length) return null;
    const nums = data.hourly.pressureMsl.filter(
      (p): p is number => p != null && Number.isFinite(p),
    );
    if (nums.length === 0) return null;
    return {
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
  }, [data]);

  const load = useCallback(async () => {
    setError("");
    setGeoMsg("");
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError(t("forecast.error"));
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const u = new URL("/api/fishing-forecast", window.location.origin);
      u.searchParams.set("lat", String(lat));
      u.searchParams.set("lon", String(lon));
      u.searchParams.set("date", date);
      const res = await fetch(u.toString());
      const json = (await res.json()) as FishingForecastPayload & {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (json.code === "DATE_UNAVAILABLE") {
          setError(t("forecast.dateNotAvailable"));
          return;
        }
        setError(json.error ?? t("forecast.error"));
        return;
      }
      setData(json);
    } catch {
      setError(t("forecast.error"));
    } finally {
      setLoading(false);
    }
  }, [date, lat, lon, t]);

  function useMyLocation() {
    setGeoMsg("");
    if (!navigator.geolocation) {
      setGeoMsg(t("forecast.locationError"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLocationLabel(t("forecast.nearYou"));
      },
      () => setGeoMsg(t("forecast.locationDenied")),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col bg-gradient-to-b from-zinc-100/90 via-zinc-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900/90">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(28rem,45vh)] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,165,233,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,165,233,0.12),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto flex w-full max-w-[min(96rem,calc(100%-1.5rem))] flex-1 flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 lg:max-w-[min(112rem,calc(100%-3rem))] lg:gap-12 lg:px-10 lg:py-10 xl:px-14">
        <header className="space-y-3 lg:flex lg:items-end lg:justify-between lg:gap-10 lg:space-y-0">
          <div className="space-y-2 lg:max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
            </p>
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl lg:text-[2.35rem] dark:text-zinc-50">
              {t("forecast.title")}
            </h1>
            <p className="max-w-3xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 lg:text-lg">
              {t("forecast.subtitle")}
            </p>
          </div>
        </header>

        <section className="rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8 lg:items-end">
            <div className="min-w-0 lg:col-span-7 xl:col-span-8">
              <FishingLocationSearch
                locale={locale}
                latitude={lat}
                longitude={lon}
                locationLabel={locationLabel}
                onLocationChange={(nextLat, nextLon, label) => {
                  setLat(nextLat);
                  setLon(nextLon);
                  setLocationLabel(label);
                }}
                searchPlaceholder={t("forecast.searchPlaceholder")}
                searchingLabel={t("forecast.searching")}
                noResultsLabel={t("forecast.searchNoResults")}
                locationSectionLabel={t("forecast.location")}
                unsetHint={t("forecast.locationUnset")}
              />
            </div>
            <div className="flex flex-col gap-4 lg:col-span-5 xl:col-span-4">
              <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {t("forecast.date")}
                <input
                  type="date"
                  value={date}
                  max={maxForecastDateISO()}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1.5 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50 lg:max-w-none"
                />
              </label>
              <div className="flex flex-wrap gap-2 lg:pt-0.5">
                <button
                  type="button"
                  onClick={() => useMyLocation()}
                  className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {t("forecast.useLocation")}
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={loading}
                  className="min-h-11 flex-1 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60 sm:flex-initial sm:min-w-[10rem]"
                >
                  {loading ? t("forecast.loading") : t("forecast.load")}
                </button>
              </div>
            </div>
          </div>
          {geoMsg ? (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">{geoMsg}</p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </section>

      {data && (
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {t("forecast.timezone", { tz: data.timezone })}
          </p>

          {conditionStars != null && (
            <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:to-zinc-900/50 sm:p-6 lg:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="space-y-1 lg:max-w-2xl">
                  <h2 className="text-lg font-semibold text-zinc-900 lg:text-xl dark:text-zinc-50">
                    {t("forecast.rating.title")}
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t("forecast.rating.subtitle")}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 lg:shrink-0">
                  <FishingConditionStars
                    value={conditionStars}
                    ariaLabel={t("forecast.rating.aria", {
                      stars: String(conditionStars),
                      label: t(FORECAST_RATING_LEVEL_KEYS[conditionStars - 1]),
                    })}
                  />
                  <p className="text-base font-medium text-zinc-800 dark:text-zinc-100 sm:text-lg">
                    {t(FORECAST_RATING_LEVEL_KEYS[conditionStars - 1])}
                  </p>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-6 lg:gap-8 xl:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 lg:p-6 xl:col-span-2">
              <h2 className="text-lg font-semibold text-zinc-900 lg:text-xl dark:text-zinc-50">
                {t("forecast.pressureTitle")}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t("forecast.pressureTrend")}: {trendLabel}
              </p>
              {data.pressureHpaFirst != null && data.pressureHpaLast != null && (
                <p className="mt-2 font-mono text-sm text-zinc-800 dark:text-zinc-200">
                  {t("forecast.pressureHpa", {
                    first: data.pressureHpaFirst.toFixed(0),
                    last: data.pressureHpaLast.toFixed(0),
                  })}
                </p>
              )}
              <h3 className="mt-4 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {t("forecast.hourlyChart")}
              </h3>
              <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/60 lg:p-4">
                {pressureRangeLabel ? (
                  <FishingPressureChart
                    timeIso={data.hourly.time}
                    pressureHpa={data.hourly.pressureMsl}
                    timeZone={data.timezone}
                    intlLocale={intlLocale}
                    aria-label={t("forecast.chart.aria", {
                      min: pressureRangeLabel.min.toFixed(0),
                      max: pressureRangeLabel.max.toFixed(0),
                    })}
                  />
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t("forecast.trend.unknown")}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 lg:p-6 xl:col-span-1">
              <h2 className="text-lg font-semibold text-zinc-900 lg:text-xl dark:text-zinc-50">
                {t("forecast.solunarTitle")}
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.biteWindows.map((w, i) => (
                  <li
                    key={`${w.kind}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950/50"
                  >
                    <span
                      className={
                        w.kind === "major"
                          ? "font-semibold text-emerald-700 dark:text-emerald-400"
                          : "font-medium text-amber-800 dark:text-amber-300"
                      }
                    >
                      {w.kind === "major" ? t("forecast.major") : t("forecast.minor")}
                    </span>
                    <span className="text-right font-mono text-xs text-zinc-700 dark:text-zinc-300">
                      {t("forecast.window", {
                        start: formatTime(w.start, data.timezone, intlLocale),
                        end: formatTime(w.end, data.timezone, intlLocale),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-6 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {t("forecast.sunMoon")}
              </h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
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

          <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 lg:text-sm">
              {t("forecast.disclaimer")}
            </p>

            <section className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-5 dark:border-zinc-700 dark:bg-zinc-950/40 lg:p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                {t("forecast.attributionTitle")}
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {data.attribution.weather}
              </p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {data.attribution.solunar}
              </p>
              <div className="mt-4">
                <a
                  href="https://open-meteo.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-sky-600 hover:underline dark:text-sky-400"
                >
                  {t("forecast.linkOpenMeteo")}
                </a>
              </div>
            </section>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
