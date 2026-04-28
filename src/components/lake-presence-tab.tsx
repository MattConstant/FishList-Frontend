"use client";

import { useMemo } from "react";
import { useLocale } from "@/contexts/locale-context";
import { translateStockingSpecies } from "@/lib/species-i18n";

type Props = {
  name: string;
  speciesSummary: string;
};

function splitSpeciesSummary(summary: string): string[] {
  return summary
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function LakePresenceTab({ name, speciesSummary }: Props) {
  const { t, locale } = useLocale();

  const speciesList = useMemo(
    () => splitSpeciesSummary(speciesSummary),
    [speciesSummary],
  );

  return (
    <div className="space-y-3 text-sm text-zinc-800 dark:text-zinc-100">
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {t("forecast.mapPresenceNote")}
      </p>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-600 dark:bg-zinc-800/40">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          {t("forecast.mapPresenceHeading")}
        </p>
        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {name || t("forecast.mapPresenceUnknown")}
        </p>
        <p className="mt-0.5 text-[0.7rem] text-zinc-500 dark:text-zinc-400">
          {t("forecast.mapPresenceCount", { count: speciesList.length })}
        </p>
      </div>

      {speciesList.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-500 dark:border-zinc-600">
          {t("forecast.mapPresenceEmpty")}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {speciesList.map((sp, i) => {
            const label = translateStockingSpecies(sp, locale);
            const showOriginal = label !== sp;
            return (
              <li
                key={`${sp}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70"
              >
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "#059669" }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">
                    {label}
                  </span>
                  {showOriginal ? (
                    <span className="ml-1 text-[0.7rem] text-zinc-400">
                      ({sp})
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
