/**
 * Multi-province stocking loader: Ontario GeoHub + curated Yukon + Quebec MFFP lists.
 */

import {
  fetchAllStockingRecords,
  groupByWaterbody,
  type StockingRecord,
  type WaterbodyGroup,
} from "@/lib/map/geohub";
import type { StockingProvince } from "@/lib/map/stocking-provinces";
import { getQuebecStockingRecords } from "@/lib/map/quebec-stocking";
import { getYukonStockingRecords } from "@/lib/map/yukon-stocking";

export type StockingLoadResult = {
  records: StockingRecord[];
  groups: WaterbodyGroup[];
};

/**
 * Loads stocking for the enabled provinces and merges into one record list.
 * Ontario hits ArcGIS; Yukon/Quebec are static. Progress counts Ontario rows only.
 */
export async function fetchStockingForProvinces(
  provinces: Iterable<StockingProvince>,
  years = 5,
  onProgress?: (loaded: number) => void,
): Promise<StockingLoadResult> {
  const enabled = new Set(provinces);
  const parts: StockingRecord[] = [];

  if (enabled.has("ON")) {
    const ontario = await fetchAllStockingRecords(years, onProgress);
    parts.push(...ontario);
  }

  if (enabled.has("YT")) {
    parts.push(...getYukonStockingRecords());
  }

  if (enabled.has("QC")) {
    parts.push(...getQuebecStockingRecords());
  }

  return {
    records: parts,
    groups: groupByWaterbody(parts),
  };
}
