"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { WaterbodyGroup } from "@/lib/geohub";

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

function buildPopupHtml(g: WaterbodyGroup): string {
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
    `<div style="max-height:260px;overflow:auto;font-size:13px;line-height:1.4">` +
    `<strong style="font-size:14px">${g.waterbody}</strong><br/>` +
    `<span style="color:#555">${g.speciesSet.size} species &middot; ${g.totalFish.toLocaleString()} fish total</span>` +
    `<br/><span style="color:#777;font-size:12px">Stocking point from GeoHub (can be approximate for large waterbodies)</span>` +
    `<br/><span style="color:#555">District: ${districts || "Unknown"}</span>` +
    `<br/><span style="color:#555">Stage(s): ${stages || "Unknown"}</span>` +
    `<table style="margin-top:6px;border-collapse:collapse;width:100%">` +
    `<tr style="border-bottom:1px solid #ddd;font-weight:600">` +
    `<td style="padding:2px 6px">Species</td><td style="padding:2px 6px;text-align:center">Year</td>` +
    `<td style="padding:2px 6px;text-align:right">Count</td></tr>` +
    rows +
    `</table></div>`
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
  placing,
  catchMarkers = [],
  catchScope = "all",
  friendIds = new Set<number>(),
  currentUserId,
}: StockingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const userLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: ONTARIO_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: true,
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

    const cluster = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
    });

    const icon = fishIcon();

    for (const g of filteredGroups) {
      const marker = L.marker([g.lat, g.lng], { icon });
      marker.bindPopup(buildPopupHtml(g), { maxWidth: 340 });
      cluster.addLayer(marker);
    }

    map.addLayer(cluster);
    clusterRef.current = cluster;
  }, [filteredGroups]);

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
