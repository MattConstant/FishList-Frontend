"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { fetchLakeFishingInsights, getDisplayErrorMessage } from "@/lib/api";
import { waterbodyGroupKey, type WaterbodyGroup } from "@/lib/geohub";
import { refineLakePin } from "@/lib/lake-geocode";
import { waterbodyToInsightPayload } from "@/lib/lake-insights";

const ONTARIO_CENTER: [number, number] = [49.5, -85.0];
const DEFAULT_ZOOM = 5;

const FISH_SVG =
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">` +
    `<path fill="#0369a1" stroke="#fff" stroke-width="1.2" d="M12 4C7 4 2 8 1 12c1 4 6 8 11 8 2-1.5 3.5-3 4.5-4.5L21 18l-1-6 1-6-4.5 2.5C15.5 7 14 5.5 12 4z"/>` +
    `<circle cx="7" cy="11.5" r="1.2" fill="#fff"/>` +
    `</svg>`,
  )}`;

const USER_CATCH_SVG =
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="32" height="38">` +
    `<path d="M18 1.5C9.2 1.5 2 8.7 2 17.5c0 12.2 13 23.5 15.1 25.2a1.4 1.4 0 0 0 1.8 0C21 41 34 29.7 34 17.5 34 8.7 26.8 1.5 18 1.5z" fill="#dc2626" stroke="#fff" stroke-width="2"/>` +
    `<path d="M23.2 11.8 14 21" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>` +
    `<circle cx="12.2" cy="22.8" r="5.6" fill="none" stroke="#fff" stroke-width="2"/>` +
    `<path d="m8.6 19.2 7.2 7.2m-7.2 0 7.2-7.2" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>` +
    `</svg>`,
  )}`;

const OTHER_CATCH_SVG =
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="30" height="36">` +
    `<path d="M18 1.5C9.2 1.5 2 8.7 2 17.5c0 12.2 13 23.5 15.1 25.2a1.4 1.4 0 0 0 1.8 0C21 41 34 29.7 34 17.5 34 8.7 26.8 1.5 18 1.5z" fill="#0284c7" stroke="#fff" stroke-width="2"/>` +
    `<path d="M23.2 11.8 14 21" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>` +
    `<circle cx="12.2" cy="22.8" r="5.6" fill="none" stroke="#fff" stroke-width="2"/>` +
    `<path d="m8.6 19.2 7.2 7.2m-7.2 0 7.2-7.2" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>` +
    `</svg>`,
  )}`;

function fishIcon(): L.Icon {
  return L.icon({
    iconUrl: FISH_SVG,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function userCatchIcon(): L.Icon {
  return L.icon({
    iconUrl: USER_CATCH_SVG,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
    popupAnchor: [0, -30],
  });
}

function otherCatchIcon(): L.Icon {
  return L.icon({
    iconUrl: OTHER_CATCH_SVG,
    iconSize: [30, 36],
    iconAnchor: [15, 34],
    popupAnchor: [0, -28],
  });
}

function buildPopupHtml(g: WaterbodyGroup, lakeKeyEncoded: string): string {
  const districts = Array.from(g.districtSet).join(", ");
  const stages = Array.from(g.developmentalStageSet).join(", ");
  const rows = g.records
    .sort((a, b) => b.year - a.year || a.species.localeCompare(b.species))
    .map(
      (r) =>
        `<tr><td style="padding:2px 6px">${r.species}</td>` +
        `<td style="padding:2px 6px;text-align:center">${r.year}</td>` +
        `<td style="padding:2px 6px;text-align:right">${r.count.toLocaleString()}</td></tr>`,
    )
    .join("");

  return (
    `<div class="fishlist-stock-popup" style="max-height:280px;overflow:auto;font-size:13px;line-height:1.4">` +
    `<strong style="font-size:14px">${g.waterbody}</strong><br/>` +
    `<span style="color:#555">${g.speciesSet.size} species &middot; ${g.totalFish.toLocaleString()} fish total</span>` +
    `<br/><span style="color:#777;font-size:12px">GeoHub coordinates are often approximate; we try to snap the pin onto the lake using OpenStreetMap search.</span>` +
    `<br/><span style="color:#555">District: ${districts || "Unknown"}</span>` +
    `<br/><span style="color:#555">Stage(s): ${stages || "Unknown"}</span>` +
    `<table style="margin-top:6px;border-collapse:collapse;width:100%">` +
    `<tr style="border-bottom:1px solid #ddd;font-weight:600">` +
    `<td style="padding:2px 6px">Species</td><td style="padding:2px 6px;text-align:center">Year</td>` +
    `<td style="padding:2px 6px;text-align:right">Count</td></tr>` +
    rows +
    `</table>` +
    `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #e4e4e7">` +
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:11px;color:#059669;font-weight:600">` +
    `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 2px rgba(34,197,94,.25)"></span>` +
    `Fish stocked here` +
    `</div>` +
    `<button type="button" class="fishlist-ai-tips-btn" data-lake-key="${lakeKeyEncoded}" ` +
    `style="width:auto;max-width:min(100%,220px);cursor:pointer;border-radius:8px;border:1px solid #c4b5fd;background:#f5f3ff;color:#5b21b6;font-size:12px;font-weight:600;padding:6px 12px;display:inline-flex;align-items:center;justify-content:center;gap:6px">` +
    `<span aria-hidden="true">✨</span> Fishing tips <span style="opacity:.85;font-weight:500">(AI)</span>` +
    `</button>` +
    `<div class="fishlist-ai-tips-result" style="display:none;margin-top:8px;padding:8px;border-radius:8px;background:#fafafa;border:1px solid #e4e4e7;font-size:12px;line-height:1.45;color:#3f3f46;white-space:pre-wrap;max-height:280px;overflow-y:auto"></div>` +
    `</div></div>`
  );
}

export type CatchMapMarker = {
  lat: number;
  lng: number;
  accountId: number;
  username: string;
  locationName: string;
  catches: { species: string; quantity?: number; imageUrl?: string }[];
};

type StockingMapProps = {
  groups: WaterbodyGroup[];
  activeSpecies: Set<string>;
  onMapClick?: (lat: number, lng: number) => void;
  /** Logged-in users can request AI fishing tips (text) from the popup. */
  canUseAi?: boolean;
  placing?: boolean;
  catchMarkers?: CatchMapMarker[];
  catchScope?: "all" | "friends" | "mine";
  friendIds?: Set<number>;
  currentUserId?: number;
};

export default function StockingMap({
  groups,
  activeSpecies,
  onMapClick,
  canUseAi = false,
  placing,
  catchMarkers = [],
  catchScope = "all",
  friendIds = new Set<number>(),
  currentUserId,
}: StockingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  /** Stocking markers by lake key — updated in place when geocode refines coords (avoids rebuilding cluster and closing popups). */
  const stockingMarkerByKeyRef = useRef<Map<string, L.Marker>>(new Map());
  const userLayerRef = useRef<L.LayerGroup | null>(null);
  const groupsByKeyRef = useRef<Map<string, WaterbodyGroup>>(new Map());
  const canUseAiRef = useRef(canUseAi);
  canUseAiRef.current = canUseAi;

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

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

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
    const container = containerRef.current;
    if (!container) return;
    container.style.cursor = placing ? "crosshair" : "";
  }, [placing]);

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

  const displayGroups = useMemo(() => {
    return filteredGroups.map((g) => {
      const k = waterbodyGroupKey(g);
      const o = positionOverrides[k];
      if (!o) return g;
      return { ...g, lat: o.lat, lng: o.lng };
    });
  }, [filteredGroups, positionOverrides]);

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

  useEffect(() => {
    const m = new Map<string, WaterbodyGroup>();
    for (const g of displayGroups) {
      m.set(waterbodyGroupKey(g), g);
    }
    groupsByKeyRef.current = m;
  }, [displayGroups]);

  const onAiTipsButton = useCallback(async (ev: MouseEvent) => {
    const raw = (ev.target as HTMLElement).closest(
      "button.fishlist-ai-tips-btn",
    ) as HTMLButtonElement | null;
    if (!raw || !containerRef.current?.contains(raw)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const enc = raw.getAttribute("data-lake-key");
    if (!enc) return;
    let key: string;
    try {
      key = decodeURIComponent(enc);
    } catch {
      return;
    }
    const g = groupsByKeyRef.current.get(key);
    const resultEl = raw.parentElement?.querySelector(
      ".fishlist-ai-tips-result",
    ) as HTMLDivElement | null;
    if (!g || !resultEl) return;

    resultEl.style.display = "block";
    if (!canUseAiRef.current) {
      resultEl.innerHTML =
        '<a href="/login" style="color:#2563eb;font-weight:600;text-decoration:underline">Sign in</a> to get AI tips.';
      return;
    }
    resultEl.textContent = "Loading…";
    raw.disabled = true;
    try {
      const { text } = await fetchLakeFishingInsights(
        waterbodyToInsightPayload(g),
      );
      resultEl.textContent = "";
      const narrative = document.createElement("div");
      narrative.style.whiteSpace = "pre-wrap";
      narrative.textContent = text;
      resultEl.appendChild(narrative);
      const note = document.createElement("div");
      note.style.fontSize = "11px";
      note.style.color = "#71717a";
      note.style.marginTop = "8px";
      note.style.lineHeight = "1.4";
      note.textContent =
        "Tips are general ideas only — always check Ontario regulations, limits, and access before fishing.";
      resultEl.appendChild(note);
    } catch (e) {
      resultEl.textContent = getDisplayErrorMessage(e, "Could not load tips.");
    } finally {
      raw.disabled = false;
    }
  }, []);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    root.addEventListener("click", onAiTipsButton);
    return () => root.removeEventListener("click", onAiTipsButton);
  }, [onAiTipsButton]);

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
      marker.bindPopup(buildPopupHtml(gPopup, encodeURIComponent(key)), {
        maxWidth: 340,
        closeOnClick: false,
      });
      marker.on("popupopen", () => {
        const hint = hintsByKey.get(key);
        if (hint) {
          enqueueGeocode(key, hint.waterbody, hint.lat, hint.lng);
        }
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
    const mineIcon = userCatchIcon();
    const othersIcon = otherCatchIcon();

    for (const markerData of filteredCatchMarkers) {
      const isMine = markerData.accountId === currentUserId;
      const catchLines = markerData.catches
        .map((c) => `${c.species}${c.quantity && c.quantity > 1 ? ` x${c.quantity}` : ""}`)
        .join("<br/>");
      const images = markerData.catches
        .filter((c) => c.imageUrl)
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
        icon: isMine ? mineIcon : othersIcon,
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
