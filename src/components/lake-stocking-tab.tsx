"use client";

import { useMemo } from "react";
import { useLocale } from "@/contexts/locale-context";
import type { WaterbodyGroup } from "@/lib/geohub";
import { LakeAiTipsSection } from "@/components/lake-ai-tips";

type Props = {
  group: WaterbodyGroup;
  canUseAi: boolean;
};

export function LakeStockingTab({ group, canUseAi }: Props) {
  const { t } = useLocale();

  const districts = useMemo(
    () => Array.from(group.districtSet).join(", "),
    [group.districtSet],
  );
  const stages = useMemo(
    () => Array.from(group.developmentalStageSet).join(", "),
    [group.developmentalStageSet],
  );

  const tableRows = useMemo(
    () =>
      [...group.records].sort(
        (a, b) => b.year - a.year || a.species.localeCompare(b.species),
      ),
    [group.records],
  );

  return (
    <div className="space-y-3 text-sm text-zinc-800 dark:text-zinc-100">
      <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {t("forecast.mapGeohubNote")}
      </p>
      <div className="space-y-1 text-xs sm:text-sm">
        <p>
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            {t("forecast.mapDistrict")}{" "}
          </span>
          {districts || "—"}
        </p>
        <p>
          <span className="font-medium text-zinc-600 dark:text-zinc-300">
            {t("forecast.mapStage")}{" "}
          </span>
          {stages || "—"}
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-600">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/80">
              <th className="px-2 py-2 font-semibold text-zinc-700 dark:text-zinc-200">
                {t("forecast.mapColSpecies")}
              </th>
              <th className="px-2 py-2 text-center font-semibold text-zinc-700 dark:text-zinc-200">
                {t("forecast.mapColYear")}
              </th>
              <th className="px-2 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-200">
                {t("forecast.mapColCount")}
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r, i) => (
              <tr
                key={`${r.species}-${r.year}-${i}`}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-700/80"
              >
                <td className="px-2 py-1.5">{r.species}</td>
                <td className="px-2 py-1.5 text-center tabular-nums">{r.year}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">
                  {r.count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LakeAiTipsSection group={group} canUseAi={canUseAi} />
    </div>
  );
}
