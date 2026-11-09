/**
 * Yukon stocked lakes (Environment Yukon Stocked Lakes Program).
 *
 * No public ArcGIS FeatureServer equivalent to Ontario GeoHub exists, so this
 * curated list mirrors https://yukon.ca/.../fishing-stocked-lakes.
 * Coordinates from CGNDB, Nominatim, GPS chart extents, or published reports.
 */

import type { StockingRecord } from "@/lib/map/geohub";

type YukonLake = {
  waterbody: string;
  district: string;
  lat: number;
  lng: number;
  species: string[];
};

/** Program year used so lakes pass the map’s “recent years” filter. Counts are unknown. */
const YUKON_STOCKING_YEAR = new Date().getFullYear();

const YUKON_LAKES: YukonLake[] = [
  // Whitehorse area
  {
    waterbody: "Hidden Lakes",
    district: "Whitehorse area",
    lat: 60.691828,
    lng: -135.003834,
    species: ["Rainbow Trout", "Kokanee"],
  },
  {
    waterbody: "Chadden Lake",
    district: "Whitehorse area",
    lat: 60.671612,
    lng: -134.98235,
    species: ["Rainbow Trout", "Arctic Char"],
  },
  {
    waterbody: "Long Lake",
    district: "Whitehorse area",
    lat: 60.740364,
    lng: -135.042722,
    species: ["Kokanee", "Arctic Char"],
  },
  {
    waterbody: "Cantlie Lake",
    district: "Whitehorse area",
    lat: 60.662993,
    lng: -134.828458,
    species: ["Arctic Char"],
  },
  {
    waterbody: "Scout Lake",
    district: "Whitehorse area",
    lat: 60.786454,
    lng: -135.425244,
    species: ["Rainbow Trout", "Kokanee"],
  },
  {
    waterbody: "Judas Lake",
    district: "Whitehorse area",
    lat: 60.385,
    lng: -134.13,
    species: ["Rainbow Trout", "Arctic Char"],
  },
  {
    waterbody: "Salmo Lake",
    district: "Whitehorse area",
    lat: 60.445,
    lng: -133.56,
    species: ["Rainbow Trout"],
  },
  // Watson Lake area
  {
    waterbody: "Hour Lake",
    district: "Watson Lake area",
    lat: 60.058776,
    lng: -128.667245,
    species: ["Rainbow Trout", "Kokanee"],
  },
  {
    waterbody: "Lucky Lake",
    district: "Watson Lake area",
    lat: 60.01732,
    lng: -128.58308,
    species: ["Rainbow Trout", "Kokanee"],
  },
  {
    waterbody: "Rantin Lake",
    district: "Watson Lake area",
    lat: 60.03,
    lng: -129.04,
    species: ["Rainbow Trout"],
  },
  {
    waterbody: "Veronica Lake",
    district: "Watson Lake area",
    lat: 60.088889,
    lng: -130.396389,
    species: ["Kokanee", "Arctic Char"],
  },
  // Central Yukon
  {
    waterbody: "Gloria Lake II",
    district: "Central Yukon",
    lat: 62.187,
    lng: -136.389,
    species: ["Rainbow Trout", "Arctic Char"],
  },
  {
    waterbody: "Wrong Lake",
    district: "Central Yukon",
    lat: 63.155,
    lng: -136.505,
    species: ["Rainbow Trout"],
  },
  {
    waterbody: "Fisheye Lake",
    district: "Central Yukon",
    lat: 62.19,
    lng: -133.465,
    species: ["Rainbow Trout", "Kokanee"],
  },
  {
    waterbody: "Coffee Lake",
    district: "Central Yukon",
    lat: 61.903612,
    lng: -132.438507,
    species: ["Kokanee"],
  },
  {
    waterbody: "Whiskers Lake",
    district: "Central Yukon",
    lat: 61.965,
    lng: -132.5,
    species: ["Rainbow Trout", "Arctic Char"],
  },
  {
    waterbody: "Haldane Lake",
    district: "Central Yukon",
    lat: 63.82,
    lng: -135.85,
    species: ["Rainbow Trout", "Arctic Char"],
  },
  {
    waterbody: "Pocket Lake",
    district: "Central Yukon",
    lat: 62.133333,
    lng: -135.25,
    species: ["Arctic Char"],
  },
];

/** Static Yukon stocking records (one row per lake × species). */
export function getYukonStockingRecords(): StockingRecord[] {
  const out: StockingRecord[] = [];
  let id = 900_000;
  for (const lake of YUKON_LAKES) {
    for (const species of lake.species) {
      out.push({
        objectId: id++,
        waterbody: lake.waterbody,
        district: lake.district,
        developmentalStage: "Stocked lake",
        species,
        year: YUKON_STOCKING_YEAR,
        count: null,
        lat: lake.lat,
        lng: lake.lng,
        province: "YT",
      });
    }
  }
  return out;
}
