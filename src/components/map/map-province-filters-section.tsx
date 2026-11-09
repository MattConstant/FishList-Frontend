"use client";

import { segmentBtnClass } from "@/components/map/map-page-classes";
import {
  STOCKING_PROVINCES,
  type StockingProvince,
} from "@/lib/map/stocking-provinces";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  enabledProvinces: Set<StockingProvince>;
  onToggleProvince: (province: StockingProvince) => void;
};

const LABEL_KEY: Record<StockingProvince, string> = {
  ON: "map.provinces.ontario",
  YT: "map.provinces.yukon",
  QC: "map.provinces.quebec",
};

/** Compact province toggles for the map toolbar (next to viewing scope). */
export function MapProvinceFiltersSection({
  t,
  enabledProvinces,
  onToggleProvince,
}: Props) {
  return (
    <div
      className="map-page__segment-wrap"
      role="group"
      aria-label={t("map.provinces.hint")}
    >
        {STOCKING_PROVINCES.map((code) => {
        const on = enabledProvinces.has(code);
        return (
          <button
            key={code}
            type="button"
            onClick={() => onToggleProvince(code)}
            className={segmentBtnClass(on)}
            aria-pressed={on}
            aria-disabled={on && enabledProvinces.size === 1}
          >
            {t(LABEL_KEY[code])}
          </button>
        );
      })}
    </div>
  );
}
