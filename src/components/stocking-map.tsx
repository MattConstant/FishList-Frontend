"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { FishEntryPayload } from "@/lib/api";
import { waterbodyGroupKey, type WaterbodyGroup } from "@/lib/geohub";
import { refineLakePin } from "@/lib/lake-geocode";
import type { AraMapPoint, AraViewport } from "@/lib/ara-fish";

const ONTARIO_CENTER: [number, number] = [49.5, -85.0];
const DEFAULT_ZOOM = 5;

/** Same fish silhouette as stocking markers; only {@link bodyFill} changes for catches vs stocking. */
const FISH_BODY_PATH =
  "M12 4C7 4 2 8 1 12c1 4 6 8 11 8 2-1.5 3.5-3 4.5-4.5L21 18l-1-6 1-6-4.5 2.5C15.5 7 14 5.5 12 4z";

function fishMarkerDataUrl(bodyFill: string): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">` +
      `<path fill="${bodyFill}" stroke="#fff" stroke-width="1.2" d="${FISH_BODY_PATH}"/>` +
      `<circle cx="7" cy="11.5" r="1.2" fill="#fff"/>` +
      `</svg>`,
  )}`;
}

/** Stocking lakes — sky blue (original inline asset). */
const FISH_SVG_STOCKING = fishMarkerDataUrl("#0369a1");
/** ARA (species presence) — emerald, distinct from stocking. */
const FISH_SVG_ARA = fishMarkerDataUrl("#059669");

function fishIcon(): L.Icon {
  return L.icon({
    iconUrl: FISH_SVG_STOCKING,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function araFishIcon(): L.Icon {
  return L.icon({
    iconUrl: FISH_SVG_ARA,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -10],
  });
}

/** {@link /public/catch.png} — raw image, centered on the coordinates. */
function catchPinIcon(): L.Icon {
  return L.icon({
    iconUrl: "/catch.png",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  });
}

const FORECAST_PIN_SVG =
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="32" height="38">` +
    `<path d="M12 0C5.4 0 0 5.2 0 11.6 0 20.4 12 36 12 36s12-15.6 12-24.4C24 5.2 18.6 0 12 0z" fill="#0ea5e9" stroke="#fff" stroke-width="1.5"/>` +
    `<circle cx="12" cy="11.5" r="4.5" fill="#fff"/>` +
    `</svg>`,
  )}`;

function forecastPinIcon(): L.Icon {
  return L.icon({
    iconUrl: FORECAST_PIN_SVG,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -36],
  });
}

export type CatchMapMarker = {
  lat: number;
  lng: number;
  accountId: number;
  username: string;
  locationName: string;
  catches: {
    species: string;
    quantity?: number;
    imageUrl?: string;
    fishDetails?: FishEntryPayload[];
  }[];
};

type StockingMapProps = {
  groups: WaterbodyGroup[];
  activeSpecies: Set<string>;
  onMapClick?: (lat: number, lng: number) => void;
  placing?: boolean;
  /** Forecast pin (click-to-forecast); details render in the parent bottom sheet. */
  forecastPin?: { lat: number; lng: number } | null;
  catchMarkers?: CatchMapMarker[];
  catchScope?: "all" | "friends" | "mine";
  friendIds?: Set<number>;
  currentUserId?: number;
  /** Stocking marker clicked — open lake detail in parent UI (no Leaflet popup). */
  onStockingLakeClick?: (payload: {
    group: WaterbodyGroup;
    lat: number;
    lng: number;
  }) => void;
  /** ARA (MNRF aquatic resource) species presence — not stocking events. */
  araMarkers?: AraMapPoint[];
  /** Fires when the map is ready or the user stops panning/zooming (for viewport loading). */
  onViewportChange?: (bounds: AraViewport) => void;
  /** Aerial (Esri World Imagery) vs default street map. */
  satelliteImagery?: boolean;
};

export default function StockingMap({
  groups,
  activeSpecies,
  onMapClick,
  placing,
  forecastPin = null,
  catchMarkers = [],
  catchScope = "all",
  friendIds = new Set<number>(),
  currentUserId,
  onStockingLakeClick,
  araMarkers = [],
  onViewportChange,
  satelliteImagery = false,
}: StockingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osmTileRef = useRef<L.TileLayer | null>(null);
  const satTileRef = useRef<L.TileLayer | null>(null);
  const forecastMarkerRef = useRef<L.Marker | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const araLayerRef = useRef<L.LayerGroup | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;
  /** Stocking markers by lake key — updated in place when geocode refines coords (avoids rebuilding cluster). */
  const stockingMarkerByKeyRef = useRef<Map<string, L.Marker>>(new Map());
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const onStockingLakeClickRef = useRef(onStockingLakeClick);
  onStockingLakeClickRef.current = onStockingLakeClick;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: ONTARIO_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
      closePopupOnClick: false,
    });

    function onResize() {
      map.invalidateSize();
    }
    window.addEventListener("resize", onResize);

    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    const sat = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution:
          'Tiles &copy; <a href="https://www.esri.com/">Esri</a>, ' +
            "Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
      },
    );
    osmTileRef.current = osm;
    satTileRef.current = sat;
    if (satelliteImagery) {
      sat.addTo(map);
    } else {
      osm.addTo(map);
    }

    mapRef.current = map;

    return () => {
      window.removeEventListener("resize", onResize);
      osmTileRef.current = null;
      satTileRef.current = null;
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only initial basemap; toggles use effect below
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const osm = osmTileRef.current;
    const sat = satTileRef.current;
    if (!map || !osm || !sat) return;
    if (satelliteImagery) {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) map.addLayer(sat);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) map.addLayer(osm);
    }
  }, [satelliteImagery]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function handleClick(e: L.LeafletMouseEvent) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    }

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [onMapClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!onViewportChange) return;

    let t: ReturnType<typeof setTimeout> | undefined;
    function fire() {
      const inst = mapRef.current;
      if (!inst) return;
      const b = inst.getBounds();
      onViewportChangeRef.current?.({
        south: b.getSouth(),
        west: b.getWest(),
        north: b.getNorth(),
        east: b.getEast(),
      });
    }
    function debounced() {
      clearTimeout(t);
      t = setTimeout(fire, 420);
    }
    map.on("moveend", debounced);
    map.on("zoomend", debounced);
    queueMicrotask(fire);
    return () => {
      map.off("moveend", debounced);
      map.off("zoomend", debounced);
      clearTimeout(t);
    };
  }, [onViewportChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.style.cursor = placing ? "crosshair" : "";
  }, [placing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const lat = forecastPin?.lat;
    const lng = forecastPin?.lng;

    if (
      forecastPin == null ||
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      if (forecastMarkerRef.current) {
        map.removeLayer(forecastMarkerRef.current);
        forecastMarkerRef.current = null;
      }
      return;
    }

    if (forecastMarkerRef.current) {
      map.removeLayer(forecastMarkerRef.current);
      forecastMarkerRef.current = null;
    }

    const marker = L.marker([lat, lng], {
      icon: forecastPinIcon(),
      zIndexOffset: 1200,
    });
    marker.addTo(map);
    forecastMarkerRef.current = marker;

    return () => {
      if (forecastMarkerRef.current) {
        map.removeLayer(forecastMarkerRef.current);
        forecastMarkerRef.current = null;
      }
    };
  }, [forecastPin]);

  const filteredGroups = useMemo(() => {
    if (activeSpecies.size === 0) return [];
    return groups.filter((g) => {
      for (const s of g.speciesSet) {
        if (activeSpecies.has(s)) return true;
      }
      return false;
    });
  }, [groups, activeSpecies]);

  const [positionOverrides, setPositionOverrides] = useState<
    Record<string, { lat: number; lng: number }>
  >({});
  const overridesRef = useRef(positionOverrides);
  overridesRef.current = positionOverrides;

  const hintsByKey = useMemo(() => {
    const m = new Map<
      string,
      { lat: number; lng: number; waterbody: string }
    >();
    for (const g of filteredGroups) {
      m.set(waterbodyGroupKey(g), {
        lat: g.lat,
        lng: g.lng,
        waterbody: g.waterbody,
      });
    }
    return m;
  }, [filteredGroups]);

  const filteredGroupsRef = useRef(filteredGroups);
  filteredGroupsRef.current = filteredGroups;

  const geocodeQueueRef = useRef<
    { key: string; waterbody: string; hintLat: number; hintLng: number }[]
  >([]);
  const geocodeProcessingRef = useRef(false);

  const runGeocodeQueue = useCallback(async () => {
    if (geocodeProcessingRef.current) return;
    geocodeProcessingRef.current = true;
    try {
      while (geocodeQueueRef.current.length > 0) {
        const job = geocodeQueueRef.current.shift()!;
        if (overridesRef.current[job.key]) continue;
        const r = await refineLakePin(
          job.key,
          job.waterbody,
          job.hintLat,
          job.hintLng,
        );
        if (r) {
          setPositionOverrides((prev) => ({ ...prev, [job.key]: r }));
        }
        await new Promise<void>((res) => {
          setTimeout(res, 1500);
        });
      }
    } finally {
      geocodeProcessingRef.current = false;
      if (geocodeQueueRef.current.length > 0) {
        void runGeocodeQueue();
      }
    }
  }, []);

  const enqueueGeocode = useCallback(
    (key: string, waterbody: string, hintLat: number, hintLng: number) => {
      if (overridesRef.current[key]) return;
      if (geocodeQueueRef.current.some((j) => j.key === key)) return;
      geocodeQueueRef.current.push({ key, waterbody, hintLat, hintLng });
      void runGeocodeQueue();
    },
    [runGeocodeQueue],
  );

  const filteredCatchMarkers = useMemo(() => {
    if (catchScope === "mine") {
      return catchMarkers.filter((c) => c.accountId === currentUserId);
    }
    if (catchScope === "friends") {
      return catchMarkers.filter(
        (c) => c.accountId === currentUserId || friendIds.has(c.accountId),
      );
    }
    return catchMarkers;
  }, [catchMarkers, catchScope, currentUserId, friendIds]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }
    stockingMarkerByKeyRef.current.clear();

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    const icon = fishIcon();

    for (const g of filteredGroups) {
      const key = waterbodyGroupKey(g);
      const o = overridesRef.current[key];
      const lat = o?.lat ?? g.lat;
      const lng = o?.lng ?? g.lng;
      const gPopup: WaterbodyGroup = o ? { ...g, lat: o.lat, lng: o.lng } : g;

      const marker = L.marker([lat, lng], { icon });
      marker.bindTooltip(g.waterbody, {
        direction: "top",
        offset: L.point(0, -10),
        opacity: 1,
        className: "map-page__stocking-tooltip",
      });
      marker.on("click", () => {
        const hint = hintsByKey.get(key);
        if (hint) {
          enqueueGeocode(key, hint.waterbody, hint.lat, hint.lng);
        }
        onStockingLakeClickRef.current?.({
          group: gPopup,
          lat,
          lng,
        });
      });
      cluster.addLayer(marker);
      stockingMarkerByKeyRef.current.set(key, marker);
    }

    map.addLayer(cluster);
    clusterRef.current = cluster;
  }, [filteredGroups, hintsByKey, enqueueGeocode]);

  useEffect(() => {
    for (const [key, pos] of Object.entries(positionOverrides)) {
      const marker = stockingMarkerByKeyRef.current.get(key);
      if (marker) {
        marker.setLatLng([pos.lat, pos.lng]);
      }
    }
  }, [positionOverrides]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (araLayerRef.current) {
      map.removeLayer(araLayerRef.current);
      araLayerRef.current = null;
    }

    if (araMarkers.length === 0) return;

    const layer = L.layerGroup();
    const icon = araFishIcon();
    for (const a of araMarkers) {
      const m = L.marker([a.lat, a.lng], { icon, zIndexOffset: -200 });
      m.bindTooltip(a.name || "Waterbody", {
        direction: "top",
        offset: L.point(0, -8),
        opacity: 1,
        className: "map-page__stocking-tooltip",
      });
      if (a.species) {
        const s =
          a.species.length > 200 ? a.species.slice(0, 200) + "…" : a.species;
        m.bindPopup(
          `<div style="font-size:12px;line-height:1.4;max-width:280px">` +
            `<strong style="font-size:13px">${(a.name || "—").replace(/</g, "&lt;")}</strong><br/>` +
            `<span style="color:#3f3f46">${s.replace(/</g, "&lt;")}</span></div>`,
        );
      }
      layer.addLayer(m);
    }
    layer.addTo(map);
    araLayerRef.current = layer;
  }, [araMarkers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let t: ReturnType<typeof setTimeout>;
    function schedule() {
      clearTimeout(t);
      t = setTimeout(() => {
        const m = mapRef.current;
        if (!m) return;
        const b = m.getBounds();
        const fg = filteredGroupsRef.current;
        let added = 0;
        for (const g of fg) {
          if (added >= 15) break;
          const k = waterbodyGroupKey(g);
          if (overridesRef.current[k]) continue;
          if (!b.contains(L.latLng(g.lat, g.lng))) continue;
          if (geocodeQueueRef.current.some((j) => j.key === k)) continue;
          geocodeQueueRef.current.push({
            key: k,
            waterbody: g.waterbody,
            hintLat: g.lat,
            hintLng: g.lng,
          });
          added++;
        }
        if (added > 0) void runGeocodeQueue();
      }, 700);
    }
    map.on("moveend", schedule);
    map.on("zoomend", schedule);
    schedule();
    return () => {
      clearTimeout(t);
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
    };
  }, [runGeocodeQueue, filteredGroups.length]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLayerRef.current) {
      map.removeLayer(userLayerRef.current);
      userLayerRef.current = null;
    }

    if (filteredCatchMarkers.length === 0) return;

    const layer = L.layerGroup();
    const catchIcon = catchPinIcon();

    function formatCatchText(c: CatchMapMarker["catches"][number]): string {
      if (c.fishDetails && c.fishDetails.length > 0) {
        return c.fishDetails
          .map((f) => {
            const bits = [
              f.species,
              f.lengthCm != null ? `${f.lengthCm} cm` : null,
              f.weightKg != null ? `${f.weightKg} kg` : null,
            ].filter(Boolean);
            return bits.join(" · ");
          })
          .join("<br/>");
      }
      return `${c.species}${c.quantity && c.quantity > 1 ? ` x${c.quantity}` : ""}`;
    }

    for (const markerData of filteredCatchMarkers) {
      const isMine = markerData.accountId === currentUserId;
      const catchLines = markerData.catches.map((c) => formatCatchText(c)).join("<br/>");
      const seenImageUrls = new Set<string>();
      const images = markerData.catches
        .filter((c) => {
          if (!c.imageUrl || seenImageUrls.has(c.imageUrl)) return false;
          seenImageUrls.add(c.imageUrl);
          return true;
        })
        .map(
          (c) =>
            `<img src="${c.imageUrl}" alt="${c.species}" style="width:100%;max-height:160px;object-fit:cover;border-radius:6px;margin-top:6px"/>`,
        )
        .join("");
      const badge = isMine
        ? `<span style="display:inline-block;margin-left:6px;font-size:10px;padding:1px 6px;border-radius:9px;background:#dc2626;color:#fff;vertical-align:middle">My catch</span>`
        : `<span style="display:inline-block;margin-left:6px;font-size:10px;padding:1px 6px;border-radius:9px;background:#0284c7;color:#fff;vertical-align:middle">@${markerData.username}</span>`;
      const html =
        `<div style="font-size:13px;line-height:1.4;max-width:280px">` +
        `<strong style="font-size:14px">${markerData.locationName}</strong>` +
        badge +
        `<br/>${catchLines}${images}</div>`;
      const marker = L.marker([markerData.lat, markerData.lng], {
        icon: catchIcon,
      });
      marker.bindPopup(html, { maxWidth: 320 });
      layer.addLayer(marker);
    }

    layer.addTo(map);
    userLayerRef.current = layer;
  }, [filteredCatchMarkers, currentUserId]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
    />
  );
}
