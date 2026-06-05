"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type StockingMapDefault from "@/components/stocking-map";

const StockingMapLazy = dynamic(() => import("@/components/stocking-map"), {
  ssr: false,
  loading: () => (
    <div className="map-page__stocking-loading">Initializing map…</div>
  ),
});

export type StockingMapLazyProps = ComponentProps<typeof StockingMapDefault>;

export function StockingMapDynamic(props: StockingMapLazyProps) {
  return <StockingMapLazy {...props} />;
}
