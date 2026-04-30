"use client";

import { useMemo } from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  araSummaryLineToFilters,
  type AraSpeciesFilter,
} from "@/lib/ara-fish";
import { loadAraTargetSpecies } from "@/lib/ara-preferences";
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

function SpeciesRow({
  sp,
  fav,
}: {
  sp: string;
  fav: boolean;
}) {
  const { locale } = useLocale();
  const label = translateStockingSpecies(sp, locale);
  const showOriginal = label !== sp;
  return (
    <li
      className={[
        "flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/70",
        fav ? "ring-1 ring-amber-400/50 dark:ring-amber-400/35" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: "#059669" }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="font-medium text-zinc-900 dark:text-zinc-50">{label}</span>
        {showOriginal ? (
          <span className="ml-1 text-[0.7rem] text-zinc-400">({sp})</span>
        ) : null}
      </span>
    </li>
  );
}

function SpeciesList({
  items,
  fav,
}: {
  items: string[];
  fav: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((sp, i) => (
        <SpeciesRow key={`${fav ? "f" : "o"}-${sp}-${i}`} sp={sp} fav={fav} />
      ))}
    </ul>
  );
}

export function LakePresenceTab({ name, speciesSummary }: Props) {
  const { t } = useLocale();

  const speciesList = useMemo(
    () => splitSpeciesSummary(speciesSummary),
    [speciesSummary],
  );

  const { targetKeys, favLines, otherLines } = useMemo(() => {
    const targets = loadAraTargetSpecies();
    const targetSet = new Set<AraSpeciesFilter>(targets);
    if (targetSet.size === 0) {
      return {
        targetKeys: [] as AraSpeciesFilter[],
        favLines: [] as string[],
        otherLines: speciesList,
      };
    }
    const fav: string[] = [];
    const rest: string[] = [];
    for (const line of speciesList) {
      const keys = araSummaryLineToFilters(line);
      const isFav = keys.some((k) => targetSet.has(k));
      if (isFav) fav.push(line);
      else rest.push(line);
    }
    return { targetKeys: targets, favLines: fav, otherLines: rest };
  }, [speciesList]);

  const showFavSection = targetKeys.length > 0;

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
        <div className="space-y-4">
          {showFavSection ? (
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-3 dark:border-amber-500/25 dark:bg-amber-500/5">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200/90">
                {t("forecast.mapPresenceFavHeading")}
              </p>
              {favLines.length === 0 ? (
                <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-200/70">
                  {t("forecast.mapPresenceFavNone")}
                </p>
              ) : (
                <div className="mt-2">
                  <SpeciesList items={favLines} fav />
                </div>
              )}
            </div>
          ) : null}

          {otherLines.length > 0 ? (
            <div>
              {showFavSection ? (
                <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t("forecast.mapPresenceOtherHeading")}
                </p>
              ) : null}
              <SpeciesList items={otherLines} fav={false} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
