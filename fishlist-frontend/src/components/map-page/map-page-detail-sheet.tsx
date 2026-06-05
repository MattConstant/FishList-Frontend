"use client";

import type { Dispatch, SetStateAction } from "react";
import { MapDetailBottomSheet } from "@/components/map-detail-bottom-sheet";
import { deleteCampSpot, type CampSpotResponse } from "@/lib/api";
import type { MapSheetState } from "@/components/map-page/map-page-types";

type Props = {
  mapSheet: NonNullable<MapSheetState>;
  forecastAreaLabel: string | null;
  forecastAreaLabelLoading: boolean;
  sheetExpanded: boolean;
  setSheetExpanded: (v: boolean) => void;
  onClose: () => void;
  userPresent: boolean;
  canUseAi: boolean;
  currentSheetIsFavorite: boolean;
  handleToggleMapFavorite: () => void;
  deletingCampId: number | null;
  setDeletingCampId: Dispatch<SetStateAction<number | null>>;
  setCampSpots: Dispatch<SetStateAction<CampSpotResponse[]>>;
  setMapSheet: Dispatch<SetStateAction<MapSheetState>>;
  isAdmin: boolean;
  userAccountId: number | undefined;
};

export function MapPageDetailSheet({
  mapSheet,
  forecastAreaLabel,
  forecastAreaLabelLoading,
  sheetExpanded,
  setSheetExpanded,
  onClose,
  userPresent,
  canUseAi,
  currentSheetIsFavorite,
  handleToggleMapFavorite,
  deletingCampId,
  setDeletingCampId,
  setCampSpots,
  setMapSheet,
  isAdmin,
  userAccountId,
}: Props) {
  const stableKey =
    mapSheet.mode === "lake"
      ? `lake-${mapSheet.group.waterbody}-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`
      : mapSheet.mode === "presence"
        ? `presence-${mapSheet.name}-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`
        : mapSheet.mode === "camp"
          ? `camp-${mapSheet.camp.id}-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`
          : `fc-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`;

  return (
    <MapDetailBottomSheet
      key={stableKey}
      mode={mapSheet.mode}
      lat={mapSheet.lat}
      lng={mapSheet.lng}
      lake={mapSheet.mode === "lake" ? mapSheet.group : undefined}
      presence={
        mapSheet.mode === "presence"
          ? { name: mapSheet.name, speciesSummary: mapSheet.speciesSummary }
          : undefined
      }
      camp={mapSheet.mode === "camp" ? mapSheet.camp : undefined}
      forecastAreaLabel={mapSheet.mode === "forecast" ? forecastAreaLabel : null}
      forecastAreaLabelLoading={
        mapSheet.mode === "forecast" ? forecastAreaLabelLoading : false
      }
      expanded={sheetExpanded}
      onExpandedChange={setSheetExpanded}
      onClose={onClose}
      canUseAi={canUseAi}
      showFavoriteButton={mapSheet.mode !== "camp"}
      favoriteEnabled={mapSheet.mode === "camp" ? false : userPresent}
      isFavorite={mapSheet.mode === "camp" ? false : currentSheetIsFavorite}
      onToggleFavorite={mapSheet.mode === "camp" ? () => {} : handleToggleMapFavorite}
      canDeleteCamp={
        mapSheet.mode === "camp" &&
        userPresent &&
        (isAdmin || mapSheet.camp.accountId === userAccountId)
      }
      onDeleteCamp={
        mapSheet.mode === "camp"
          ? () => {
              if (!userPresent) return;
              if (deletingCampId != null) return;
              const ok = window.confirm("Delete this camp spot?");
              if (!ok) return;
              const id = mapSheet.camp.id;
              setDeletingCampId(id);
              void (async () => {
                try {
                  await deleteCampSpot(id);
                  setCampSpots((prev) => prev.filter((c) => c.id !== id));
                  setMapSheet(null);
                } catch {
                  // Silent failure; map markers are secondary.
                } finally {
                  setDeletingCampId(null);
                }
              })();
            }
          : undefined
      }
    />
  );
}
