/**
 * Quebec waters where brook trout stocking is permitted under MFFP
 * wildlife-reserve ensemencement plans (not a live ArcGIS event feed).
 *
 * Source PDFs (Open Government / MFFP):
 * - LI_ensemencement_permis_Papineau-Labelle.pdf
 * - LI_ensemencement_permis_Mastigouche.pdf
 * - LI_ensemencement_permis_Matane.pdf
 *
 * Counts are unknown (N/A). Presence of a pin means stocking is permitted
 * for brook trout on that waterbody under the published plan — not that a
 * specific recent stocking event is recorded.
 */

import type { StockingRecord } from "@/lib/map/geohub";
import lakes from "@/lib/map/quebec-stocking-data.json";

type QuebecLake = {
  waterbody: string;
  district: string;
  lat: number;
  lng: number;
  species: string[];
};

/** Keep curated lakes inside the map’s “recent years” window. */
const YEAR = new Date().getFullYear();

/** Static Quebec stocking-permitted records (one row per lake × species). */
export function getQuebecStockingRecords(): StockingRecord[] {
  const out: StockingRecord[] = [];
  let id = 800_000;
  for (const lake of lakes as QuebecLake[]) {
    for (const species of lake.species) {
      out.push({
        objectId: id++,
        waterbody: lake.waterbody,
        district: lake.district,
        developmentalStage: "Stocking permitted",
        species,
        year: YEAR,
        count: null,
        lat: lake.lat,
        lng: lake.lng,
        province: "QC",
      });
    }
  }
  return out;
}
