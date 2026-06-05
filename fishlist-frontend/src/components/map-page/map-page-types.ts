import type { CampSpotResponse } from "@/lib/api";
import type { WaterbodyGroup } from "@/lib/geohub";

export type PendingCatch = { lat: number; lng: number };
export type PendingCamp = { lat: number; lng: number };

export type LakeSearchPinState = { lat: number; lng: number; label: string };

export type MapSheetState =
  | null
  | { mode: "forecast"; lat: number; lng: number }
  | { mode: "lake"; group: WaterbodyGroup; lat: number; lng: number }
  | {
      mode: "presence";
      lat: number;
      lng: number;
      name: string;
      speciesSummary: string;
    }
  | {
      mode: "camp";
      lat: number;
      lng: number;
      camp: CampSpotResponse;
    };
