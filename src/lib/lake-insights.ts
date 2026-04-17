import type { WaterbodyGroup } from "@/lib/geohub";

/** Request body for {@link fetchLakeFishingInsights} in `api.ts` (Spring `/api/ai/lake-fishing-insights`). */
export type LakeFishingInsightPayload = {
  waterbody: string;
  lat: number;
  lng: number;
  districts: string[];
  developmentalStages: string[];
  speciesStocked: string[];
  stockingRows: { species: string; year: number; count: number }[];
  totalFish: number;
};

export function waterbodyToInsightPayload(g: WaterbodyGroup): LakeFishingInsightPayload {
  const stockingRows = [...g.records]
    .sort((a, b) => b.year - a.year || a.species.localeCompare(b.species))
    .slice(0, 40);

  return {
    waterbody: g.waterbody,
    lat: g.lat,
    lng: g.lng,
    districts: Array.from(g.districtSet).sort(),
    developmentalStages: Array.from(g.developmentalStageSet).sort(),
    speciesStocked: Array.from(g.speciesSet).sort(),
    stockingRows,
    totalFish: g.totalFish,
  };
}
