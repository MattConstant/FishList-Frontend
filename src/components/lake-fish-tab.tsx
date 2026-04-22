"use client";

import { useMemo } from "react";
import { useLocale } from "@/contexts/locale-context";
import type { WaterbodyGroup } from "@/lib/geohub";

type Props = {
  group: WaterbodyGroup;
};

export function LakeFishTab({ group }: Props) {
  const { t } = useLocale();

  const rows = useMemo(() => {
    const bySpecies = new Map<string, number>();
    for (const r of group.records) {
      bySpecies.set(r.species, (bySpecies.get(r.species) ?? 0) + r.count);
    }
    return Array.from(bySpecies.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { sensitivity: "base" }),
    );
  }, [group]);

  return (
    <div className="space-y-3 text-sm text-zinc-800 dark:text-zinc-100">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {t("forecast.mapFishIntro")}
      </p>
      {rows.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">{t("forecast.mapFishEmpty")}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-700 dark:border-zinc-600">
          {rows.map(([species, count]) => (
            <li
              key={species}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <span className="font-medium">{species}</span>
              <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
                {count.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
