"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useSearchParams } from "next/navigation";
import type { LakeSearchPinState } from "@/components/map-page/map-page-types";

export function MapUrlLakePinLoader({
  setLakeSearchPin,
}: {
  setLakeSearchPin: Dispatch<SetStateAction<LakeSearchPinState | null>>;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const latRaw = searchParams.get("lat") ?? "";
    const lngRaw = searchParams.get("lng") ?? searchParams.get("lon") ?? "";
    const lat = Number.parseFloat(latRaw);
    const lng = Number.parseFloat(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const labelRaw =
      searchParams.get("location") ?? searchParams.get("name") ?? "";
    const label = labelRaw.trim() || "Location";
    setLakeSearchPin({ lat, lng, label });
  }, [searchParams, setLakeSearchPin]);
  return null;
}
