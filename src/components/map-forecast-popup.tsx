"use client";

import { useCallback, useEffect, useState } from "react";
import { FishingForecastPanel } from "@/components/fishing-forecast-panel";
import { useLocale } from "@/contexts/locale-context";
import { MAX_FORECAST_DAYS_AHEAD } from "@/lib/fishing-forecast-constants";
import type { FishingForecastPayload } from "@/lib/fishing-forecast-types";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function maxForecastDateISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_FORECAST_DAYS_AHEAD);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  lat: number;
  lng: number;
};

export function MapForecastPopup({ lat, lng }: Props) {
  const { t } = useLocale();
  const [date, setDate] = useState(todayISO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<FishingForecastPayload | null>(null);

  const load = useCallback(async () => {
    setError("");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setError(t("forecast.error"));
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const u = new URL("/api/fishing-forecast", window.location.origin);
      u.searchParams.set("lat", String(lat));
      u.searchParams.set("lon", String(lng));
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
  }, [date, lat, lng, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const coordLabel = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

  return (
    <div className="fishlist-map-forecast-popup w-full min-w-0 max-w-full text-zinc-900 dark:text-zinc-50">
      <div className="border-b border-zinc-200 pb-3 dark:border-zinc-700">
        <h2 className="text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
          {t("forecast.popupTitle")}
        </h2>
        <p className="mt-1 font-mono text-[0.7rem] text-zinc-500 dark:text-zinc-400">
          {coordLabel}
        </p>
        <label className="mt-3 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {t("forecast.date")}
          <input
            type="date"
            value={date}
            max={maxForecastDateISO()}
            onChange={(e) => setDate(e.target.value)}
            aria-busy={loading}
            className="mt-1 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
      </div>

      <div className="pt-3">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
        {loading && !data ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("forecast.loading")}
          </p>
        ) : null}
        {data ? (
          <FishingForecastPanel data={data} compact />
        ) : null}
      </div>
    </div>
  );
}
