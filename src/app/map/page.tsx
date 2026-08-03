"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MapFiltersShell } from "@/components/map-page/map-filters-shell";
import { MapMnrfFiltersSection } from "@/components/map-page/map-mnrf-filters-section";
import { MapAraFiltersSection } from "@/components/map-page/map-ara-filters-section";
import {
  FAVORITE_MATCH_MAX_KM,
  MAP_FILTERS_EXPANDED_KEY,
  MAP_LAYER_BATHY_KEY,
  MAP_LAYER_CAMPS_KEY,
  MAP_LAYER_CATCHES_KEY,
  MAP_LAYER_PRESENCE_KEY,
  MAP_LAYER_SATELLITE_KEY,
  MAP_LAYER_STOCKING_KEY,
  MAP_LEGEND_VISIBLE_KEY,
  MAP_LAYERS_EXPANDED_KEY,
} from "@/components/map-page/map-page-constants";
import type { MapSheetState, PendingCamp, PendingCatch } from "@/components/map-page/map-page-types";
import { MapPageDetailSheet } from "@/components/map-page/map-page-detail-sheet";
import {
  MapPageLoadingOverlay,
  MapPagePlacingBanner,
} from "@/components/map-page/map-page-map-overlays";
import { MapPageLayersPanel } from "@/components/map-page/map-page-layers-panel";
import { MapPageLegend } from "@/components/map-page/map-page-legend";
import { MapPagePendingForms } from "@/components/map-page/map-page-pending-forms";
import { MapAiSpotsPanel } from "@/components/map-page/map-ai-spots-panel";
import { MapPageToolbar } from "@/components/map-page/map-page-toolbar";
import { MapOnboardingDialog } from "@/components/map-page/map-onboarding-dialog";
import { MapUrlLakePinLoader } from "@/components/map-page/map-url-lake-pin-loader";
import { StockingMapDynamic } from "@/components/map-page/map-stock-map";
import { useMapPlaceSearch } from "@/components/map-page/use-map-place-search";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import type { AiSpotMarker, AnonCatchLabels, CatchMapMarker } from "@/components/stocking-map";
import { fetchPublicCatchRegions, type PublicCatchRegion } from "@/lib/public-catch-regions";
import { trackUsage } from "@/lib/usage-tracking";
import {
  ApiHttpError,
  fetchAreaFishingSpots,
  fetchVisibleCampSpots,
  createMapFavorite,
  deleteMapFavorite,
  fetchLatestPosts,
  fetchMyFriends,
  fetchMyMapFavorites,
  getImageUrl,
  mapFavoriteSpotDtoToFavorite,
  type CampSpotResponse,
  type FishEntryPayload,
} from "@/lib/api";
import {
  allDistricts,
  allSpecies,
  fetchAllStockingRecords,
  groupByWaterbody,
  type StockingRecord,
  type WaterbodyGroup,
} from "@/lib/geohub";
import {
  ARA_SPECIES_FILTERS,
  fetchAraInBounds,
  type AraSpeciesFilter,
  type AraMapPoint,
  type AraViewport,
} from "@/lib/ara-fish";
import {
  loadAraMapFilterSet,
  saveAraMapFilterSet,
} from "@/lib/ara-preferences";
import {
  CLIENT_PREFS_UPDATED_EVENT,
} from "@/lib/client-prefs-events";
import { formatAppInteger } from "@/lib/format-app-locale";
import { selectPrimaryWaterAnchors } from "@/lib/area-water-anchors";
import { haversineDistanceKm } from "@/lib/geo-distance";
import { initialActiveSpeciesFromPreferences } from "@/lib/fish-species-preferences";
import { useSyncedBooleanPref } from "@/lib/use-synced-boolean-pref";
import {
  loadMapFavorites,
  makeFavoriteSpotId,
  saveMapFavorites,
  type FavoriteSpot,
} from "@/lib/map-favorites";
import { MapFindPlaceSection } from "@/components/map-page/map-find-place-section";

export default function MapPage() {
  const { user, isAdmin, isReady } = useAuth();
  const { t, locale } = useLocale();
  // Prevent SSR/CSR hydration mismatches for auth-dependent attributes (like `disabled`)
  // by only applying them after the first client mount.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const {
    lakePinQuery,
    setLakePinQuery,
    lakePinError,
    lakePinSearching,
    lakeSuggestions,
    lakeSuggestionsOpen,
    setLakeSuggestionsOpen,
    lakeSuggestionIndex,
    setLakeSuggestionIndex,
    lakeSearchPin,
    setLakeSearchPin,
    handleLakePinSearch,
    handleLakeSearchKeyDown,
    selectLakeSuggestion,
    clearPlaceSearch,
  } = useMapPlaceSearch(locale, t);
  const [deletingCampId, setDeletingCampId] = useState<number | null>(null);
  const [records, setRecords] = useState<StockingRecord[]>([]);
  const [groups, setGroups] = useState<WaterbodyGroup[]>([]);
  const [species, setSpecies] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [activeSpecies, setActiveSpecies] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [recentYearsWindow, setRecentYearsWindow] = useState<1 | 2 | 5>(5);
  const [minTotalFish, setMinTotalFish] = useState<0 | 500 | 1000 | 5000>(0);
  const [minSpeciesCount, setMinSpeciesCount] = useState<1 | 2 | 3>(1);

  const [placing, setPlacing] = useState(false);
  const [placingMode, setPlacingMode] = useState<"catch" | "camp">("catch");
  const [areaSelectMode, setAreaSelectMode] = useState(false);
  const [areaDrawArmed, setAreaDrawArmed] = useState(false);
  const [areaBounds, setAreaBounds] = useState<AraViewport | null>(null);
  const [aiSpots, setAiSpots] = useState<AiSpotMarker[]>([]);
  const [aiSpotsNarrative, setAiSpotsNarrative] = useState("");
  const [aiSpotsLoading, setAiSpotsLoading] = useState(false);
  const [aiSpotsError, setAiSpotsError] = useState("");
  const [logMenuOpen, setLogMenuOpen] = useState(false);
  const [highlightLog, setHighlightLog] = useState(false);
  const [mapSheet, setMapSheet] = useState<MapSheetState>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [forecastAreaLabel, setForecastAreaLabel] = useState<string | null>(null);
  const [forecastAreaLabelLoading, setForecastAreaLabelLoading] = useState(false);
  const [pendingCatch, setPendingCatch] = useState<PendingCatch | null>(null);
  const [pendingCamp, setPendingCamp] = useState<PendingCamp | null>(null);
  const [catchMarkers, setCatchMarkers] = useState<CatchMapMarker[]>([]);
  const [anonCatchRegions, setAnonCatchRegions] = useState<PublicCatchRegion[]>([]);
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [catchScope, setCatchScope] = useState<"all" | "friends" | "mine">("all");
  const [filtersExpanded, setFiltersExpanded] = useSyncedBooleanPref(
    MAP_FILTERS_EXPANDED_KEY,
    "off-unless-true",
  );
  const [layersPanelExpanded, setLayersPanelExpanded] = useSyncedBooleanPref(
    MAP_LAYERS_EXPANDED_KEY,
    "on-unless-false",
  );
  const [showMapLegend, setShowMapLegend] = useSyncedBooleanPref(
    MAP_LEGEND_VISIBLE_KEY,
    "off-unless-true",
  );

  const [satelliteImagery, setSatelliteImagery] = useSyncedBooleanPref(
    MAP_LAYER_SATELLITE_KEY,
    "off-unless-true",
  );
  const [showStocking, setShowStocking] = useSyncedBooleanPref(
    MAP_LAYER_STOCKING_KEY,
    "on-unless-false",
  );
  const [showAra, setShowAra] = useSyncedBooleanPref(
    MAP_LAYER_PRESENCE_KEY,
    "on-unless-false",
  );
  const [showCatches, setShowCatches] = useSyncedBooleanPref(
    MAP_LAYER_CATCHES_KEY,
    "on-unless-false",
  );
  const [showCamps, setShowCamps] = useSyncedBooleanPref(
    MAP_LAYER_CAMPS_KEY,
    "on-unless-false",
  );
  const [showBathymetry, setShowBathymetry] = useSyncedBooleanPref(
    MAP_LAYER_BATHY_KEY,
    "off-unless-true",
  );
  const [favoriteSpots, setFavoriteSpots] = useState<FavoriteSpot[]>([]);
  const [campSpots, setCampSpots] = useState<import("@/lib/api").CampSpotResponse[]>([]);
  const [presenceSpecies, setPresenceSpecies] = useState<Set<AraSpeciesFilter>>(
    () => new Set(ARA_SPECIES_FILTERS),
  );
  const skipNextAraSave = useRef(false);
  const [araPoints, setAraPoints] = useState<AraMapPoint[]>([]);
  const [araLoading, setAraLoading] = useState(false);
  const [araTooWide, setAraTooWide] = useState(false);
  const lastAraViewRef = useRef<AraViewport | null>(null);
  const araFetchGen = useRef(0);

  useEffect(() => {
    if (!user) {
      setFavoriteSpots([]);
      return;
    }

    let cancelled = false;

    async function hydrateFavorites(): Promise<FavoriteSpot[]> {
      try {
        const legacy = loadMapFavorites();
        if (legacy.length > 0) {
          for (const spot of legacy) {
            try {
              await createMapFavorite({
                latitude: spot.lat,
                longitude: spot.lng,
                label: spot.label,
              });
            } catch {
              /* ignore single-spot failures */
            }
          }
          saveMapFavorites([]);
        }
        return await fetchMyMapFavorites();
      } catch {
        return [];
      }
    }

    void (async () => {
      const list = await hydrateFavorites();
      if (!cancelled) setFavoriteSpots(list);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    skipNextAraSave.current = true;
    setPresenceSpecies(loadAraMapFilterSet());
  }, []);

  useEffect(() => {
    if (skipNextAraSave.current) {
      skipNextAraSave.current = false;
      return;
    }
    saveAraMapFilterSet(presenceSpecies);
  }, [presenceSpecies]);

  useEffect(() => {
    function onClientPrefs() {
      skipNextAraSave.current = true;
      setPresenceSpecies(loadAraMapFilterSet());
    }
    window.addEventListener(CLIENT_PREFS_UPDATED_EVENT, onClientPrefs);
    return () => window.removeEventListener(CLIENT_PREFS_UPDATED_EVENT, onClientPrefs);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchAllStockingRecords(5, (n) => {
          if (!cancelled) setLoaded(n);
        });
        if (cancelled) return;
        setRecords(data);
        setGroups(groupByWaterbody(data));
        const sp = allSpecies(data);
        setSpecies(sp);
        setDistricts(allDistricts(data));
        setActiveSpecies(initialActiveSpeciesFromPreferences(sp));
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setCatchMarkers([]);
      return;
    }
    let cancelled = false;

    async function resolveImageUrl(raw?: string): Promise<string | undefined> {
      if (!raw) return undefined;
      if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
      try {
        return await getImageUrl(raw);
      } catch {
        return undefined;
      }
    }

    async function loadCatchMarkers() {
      try {
        const posts = await fetchLatestPosts(300);
        if (cancelled) return;
        const byLocation = new Map<number, CatchMapMarker>();
        for (const post of posts) {
          const lat = parseFloat(post.latitude);
          const lng = parseFloat(post.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const catchInfo = {
            species: post.catch.species ?? "",
            quantity: post.catch.quantity,
            imageUrl: await resolveImageUrl(post.catch.imageUrl),
            fishDetails: post.catch.fishDetails as FishEntryPayload[] | undefined,
          };
          const existing = byLocation.get(post.locationId);
          if (existing) {
            existing.catches.push(catchInfo);
          } else {
            byLocation.set(post.locationId, {
              lat,
              lng,
              accountId: post.accountId,
              username: post.username,
              locationName: post.locationName,
              catches: [catchInfo],
            });
          }
        }
        const markers = Array.from(byLocation.values());
        if (cancelled) return;
        setCatchMarkers(markers);
      } catch {
        // silently fail - catch markers are nice-to-have
      }
    }

    void loadCatchMarkers();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Logged-out visitors see anonymized "people caught here" pins instead of real catch markers.
  useEffect(() => {
    if (user) {
      setAnonCatchRegions([]);
      return;
    }
    let cancelled = false;
    fetchPublicCatchRegions()
      .then((regions) => {
        if (!cancelled) setAnonCatchRegions(regions);
      })
      .catch(() => {
        // silently fail - anonymous pins are nice-to-have
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const anonCatchLabels = useMemo<AnonCatchLabels>(
    () => ({
      tooltipOne: t("map.anonCatches.tooltipOne"),
      tooltipMany: t("map.anonCatches.tooltipMany"),
      popupTitle: t("map.anonCatches.popupTitle"),
      popupBodyOne: t("map.anonCatches.popupBodyOne"),
      popupBody: t("map.anonCatches.popupBody"),
      popupCta: t("map.anonCatches.popupCta"),
    }),
    [t],
  );

  useEffect(() => {
    if (!user) {
      setFriendIds(new Set());
      return;
    }
    let cancelled = false;
    fetchMyFriends()
      .then((friends) => {
        if (cancelled) return;
        setFriendIds(new Set(friends.map((f) => f.id)));
      })
      .catch(() => {
        if (!cancelled) setFriendIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // one map_visit event per page load, once we know if they're logged in
  const visitTrackedRef = useRef(false);
  useEffect(() => {
    if (!isReady || visitTrackedRef.current) return;
    visitTrackedRef.current = true;
    trackUsage("map_visit", user ? "user" : "guest");
  }, [isReady, user]);

  const toggleSpecies = useCallback(
    (sp: string) => {
      trackUsage("map_filter_species", `${sp}:${activeSpecies.has(sp) ? "off" : "on"}`);
      setActiveSpecies((prev) => {
        const next = new Set(prev);
        if (next.has(sp)) next.delete(sp);
        else next.add(sp);
        return next;
      });
    },
    [activeSpecies],
  );

  const toggleAll = useCallback(() => {
    trackUsage(
      "map_filter_species",
      activeSpecies.size === species.length ? "all:off" : "all:on",
    );
    setActiveSpecies((prev) =>
      prev.size === species.length ? new Set() : new Set(species),
    );
  }, [species, activeSpecies]);

  const handleDistrictChange = useCallback((v: string) => {
    trackUsage("map_filter_district", v);
    setSelectedDistrict(v);
  }, []);
  const handleRecentYearsChange = useCallback((v: 1 | 2 | 5) => {
    trackUsage("map_filter_years", String(v));
    setRecentYearsWindow(v);
  }, []);
  const handleMinTotalFishChange = useCallback((v: 0 | 500 | 1000 | 5000) => {
    trackUsage("map_filter_min_fish", String(v));
    setMinTotalFish(v);
  }, []);
  const handleMinSpeciesCountChange = useCallback((v: 1 | 2 | 3) => {
    trackUsage("map_filter_min_species", String(v));
    setMinSpeciesCount(v);
  }, []);

  const filteredGroups = useMemo(() => {
    if (activeSpecies.size === 0) return [];
    const maxYear = records.reduce((m, r) => Math.max(m, r.year), 0);
    const minYearForWindow = Math.max(0, maxYear - recentYearsWindow + 1);
    const allSpeciesSelected = activeSpecies.size === species.length;

    return groups.filter((g) => {
      if (g.totalFish < minTotalFish) return false;
      if (g.speciesSet.size < minSpeciesCount) return false;
      if (selectedDistrict !== "all" && !g.districtSet.has(selectedDistrict)) {
        return false;
      }

      const hasRecentRecord = g.records.some((r) => r.year >= minYearForWindow);
      if (!hasRecentRecord) return false;

      if (allSpeciesSelected) return true;
      for (const s of g.speciesSet) {
        if (activeSpecies.has(s)) return true;
      }
      return false;
    });
  }, [
    groups,
    activeSpecies,
    species.length,
    records,
    recentYearsWindow,
    minTotalFish,
    minSpeciesCount,
    selectedDistrict,
  ]);

  const displayStockingGroups = useMemo(
    () => (showStocking ? filteredGroups : []),
    [showStocking, filteredGroups],
  );

  const loadAra = useCallback(
    (v: AraViewport) => {
      lastAraViewRef.current = v;
      if (!showAra) {
        setAraPoints([]);
        setAraTooWide(false);
        setAraLoading(false);
        return;
      }
      const speciesList = Array.from(presenceSpecies);
      if (speciesList.length === 0) {
        setAraPoints([]);
        setAraTooWide(false);
        setAraLoading(false);
        return;
      }
      const gen = ++araFetchGen.current;
      setAraLoading(true);
      setAraTooWide(false);
      fetchAraInBounds(v, { species: speciesList })
        .then((r) => {
          if (gen !== araFetchGen.current) return;
          setAraPoints(r.features);
          setAraTooWide(r.tooWide);
        })
        .catch(() => {
          if (gen !== araFetchGen.current) return;
          setAraPoints([]);
        })
        .finally(() => {
          if (gen === araFetchGen.current) setAraLoading(false);
        });
    },
    [showAra, presenceSpecies],
  );

  useEffect(() => {
    if (!showAra) {
      araFetchGen.current += 1;
      setAraPoints([]);
      setAraTooWide(false);
      setAraLoading(false);
      return;
    }
    if (lastAraViewRef.current) {
      loadAra(lastAraViewRef.current);
    }
  }, [showAra, presenceSpecies, loadAra]);

  const togglePresenceSpecies = useCallback((speciesKey: AraSpeciesFilter) => {
    setPresenceSpecies((prev) => {
      const next = new Set(prev);
      if (next.has(speciesKey)) {
        next.delete(speciesKey);
      } else {
        next.add(speciesKey);
      }
      return next;
    });
  }, []);

  const toggleAllPresenceSpecies = useCallback(() => {
    setPresenceSpecies((prev) =>
      prev.size === ARA_SPECIES_FILTERS.length
        ? new Set<AraSpeciesFilter>()
        : new Set<AraSpeciesFilter>(ARA_SPECIES_FILTERS),
    );
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (areaSelectMode) return;
      if (placing) {
        setPlacing(false);
        if (placingMode === "camp") {
          setPendingCamp({ lat, lng });
        } else {
          setPendingCatch({ lat, lng });
        }
        return;
      }
      setMapSheet({ mode: "forecast", lat, lng });
      setSheetExpanded(false);
    },
    [placing, placingMode, areaSelectMode],
  );

  const clearAiSpots = useCallback(() => {
    setAiSpots([]);
    setAiSpotsNarrative("");
    setAiSpotsError("");
  }, []);

  const exitAreaSelect = useCallback(() => {
    setAreaSelectMode(false);
    setAreaDrawArmed(false);
  }, []);

  const toggleAreaSelect = useCallback(() => {
    setAreaSelectMode((v) => {
      const next = !v;
      if (next) {
        setPlacing(false);
        setLogMenuOpen(false);
        setMapSheet(null);
        setAreaDrawArmed(false);
        trackUsage("map_ai_spots", "enter");
      } else {
        setAreaDrawArmed(false);
        trackUsage("map_ai_spots", "exit");
      }
      return next;
    });
  }, []);

  const askAreaSpots = useCallback(async () => {
    if (!areaBounds || aiSpotsLoading) return;
    setAiSpotsLoading(true);
    setAiSpotsError("");
    trackUsage("map_ai_spots", "ask");
    try {
      const targetSpecies =
        activeSpecies.size > 0 && activeSpecies.size < species.length
          ? Array.from(activeSpecies).slice(0, 8).join(", ")
          : undefined;

      // Collect stocking / presence pins in the box, then keep only the main
      // lake cluster (dense + near center) so small edge ponds are dropped.
      const pad = 0.004;
      const inBox = (lat: number, lng: number) =>
        lat >= areaBounds.south - pad &&
        lat <= areaBounds.north + pad &&
        lng >= areaBounds.west - pad &&
        lng <= areaBounds.east + pad;

      const candidates: { lat: number; lng: number; name: string }[] = [];
      const seen = new Set<string>();
      const pushAnchor = (lat: number, lng: number, name: string) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBox(lat, lng)) return;
        const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        if (seen.has(key)) return;
        seen.add(key);
        candidates.push({
          lat,
          lng,
          name: name.trim() || "Waterbody",
        });
      };

      for (const g of groups) {
        pushAnchor(g.lat, g.lng, g.waterbody);
      }
      for (const a of araPoints) {
        pushAnchor(a.lat, a.lng, a.name);
      }

      const waterAnchors = selectPrimaryWaterAnchors(candidates, areaBounds);
      if (waterAnchors.length === 0) {
        setAiSpotsError(t("map.aiSpots.noWaterPins"));
        return;
      }

      const res = await fetchAreaFishingSpots({
        ...areaBounds,
        areaLabel: lakeSearchPin?.label,
        targetSpecies,
        waterAnchors,
      });
      setAiSpots(res.spots);
      setAiSpotsNarrative(res.text);
    } catch (e) {
      setAiSpots([]);
      setAiSpotsNarrative("");
      if (e instanceof ApiHttpError && e.status === 429) {
        setAiSpotsError(t("map.aiSpots.rateLimited"));
      } else {
        setAiSpotsError(
          e instanceof Error ? e.message : t("map.aiSpots.failed"),
        );
      }
    } finally {
      setAiSpotsLoading(false);
    }
  }, [
    areaBounds,
    aiSpotsLoading,
    activeSpecies,
    species.length,
    lakeSearchPin?.label,
    groups,
    araPoints,
    t,
  ]);

  const handleStockingLakeClick = useCallback(
    (payload: { group: WaterbodyGroup; lat: number; lng: number }) => {
      setMapSheet({
        mode: "lake",
        group: payload.group,
        lat: payload.lat,
        lng: payload.lng,
      });
      setSheetExpanded(false);
    },
    [],
  );

  const handleAraMarkerClick = useCallback((payload: AraMapPoint) => {
    setMapSheet({
      mode: "presence",
      lat: payload.lat,
      lng: payload.lng,
      name: payload.name,
      speciesSummary: payload.species,
    });
    setSheetExpanded(false);
  }, []);

  const handleFavoriteSpotClick = useCallback(
    (f: FavoriteSpot) => {
      let bestLake: { d: number; g: WaterbodyGroup } | null = null;
      for (const g of groups) {
        const d = haversineDistanceKm(f.lat, f.lng, g.lat, g.lng);
        if (!bestLake || d < bestLake.d) bestLake = { d, g };
      }
      let bestAra: { d: number; a: AraMapPoint } | null = null;
      for (const a of araPoints) {
        const d = haversineDistanceKm(f.lat, f.lng, a.lat, a.lng);
        if (!bestAra || d < bestAra.d) bestAra = { d, a };
      }
      const lakeOk = bestLake && bestLake.d <= FAVORITE_MATCH_MAX_KM;
      const araOk = bestAra && bestAra.d <= FAVORITE_MATCH_MAX_KM;
      if (lakeOk && araOk && bestLake && bestAra) {
        if (bestLake.d <= bestAra.d) {
          setMapSheet({
            mode: "lake",
            group: bestLake.g,
            lat: f.lat,
            lng: f.lng,
          });
        } else {
          setMapSheet({
            mode: "presence",
            lat: f.lat,
            lng: f.lng,
            name: bestAra.a.name,
            speciesSummary: bestAra.a.species,
          });
        }
      } else if (lakeOk && bestLake) {
        setMapSheet({
          mode: "lake",
          group: bestLake.g,
          lat: f.lat,
          lng: f.lng,
        });
      } else if (araOk && bestAra) {
        setMapSheet({
          mode: "presence",
          lat: f.lat,
          lng: f.lng,
          name: bestAra.a.name,
          speciesSummary: bestAra.a.species,
        });
      } else {
        setMapSheet({ mode: "forecast", lat: f.lat, lng: f.lng });
      }
      setSheetExpanded(false);
    },
    [groups, araPoints],
  );

  const currentSheetFavoriteId = useMemo(() => {
    if (!mapSheet) return null;
    return makeFavoriteSpotId(mapSheet.lat, mapSheet.lng);
  }, [mapSheet]);

  const currentSheetIsFavorite = useMemo(
    () =>
      currentSheetFavoriteId != null &&
      favoriteSpots.some(
        (f) =>
          makeFavoriteSpotId(f.lat, f.lng) === currentSheetFavoriteId,
      ),
    [favoriteSpots, currentSheetFavoriteId],
  );

  const currentSheetLabelForFavorite = useMemo(() => {
    if (!mapSheet) return "";
    if (mapSheet.mode === "lake") return mapSheet.group.waterbody;
    if (mapSheet.mode === "presence")
      return mapSheet.name.trim() || t("forecast.mapPresenceUnknown");
    if (mapSheet.mode === "forecast" && forecastAreaLabel)
      return forecastAreaLabel;
    return t("map.favorite.forecastDefaultName");
  }, [mapSheet, forecastAreaLabel, t]);

  const handleToggleMapFavorite = useCallback(() => {
    if (!mapSheet || !user) return;
    const spotKey = makeFavoriteSpotId(mapSheet.lat, mapSheet.lng);
    const snapshot = favoriteSpots;
    const existing = snapshot.find(
      (f) => makeFavoriteSpotId(f.lat, f.lng) === spotKey,
    );

    void (async () => {
      try {
        if (existing) {
          await deleteMapFavorite(Number.parseInt(existing.id, 10));
          setFavoriteSpots((prev) =>
            prev.filter((f) => f.id !== existing.id),
          );
        } else {
          const row = await createMapFavorite({
            latitude: mapSheet.lat,
            longitude: mapSheet.lng,
            label: currentSheetLabelForFavorite,
          });
          const added = mapFavoriteSpotDtoToFavorite(row);
          setFavoriteSpots((prev) => {
            const withoutDup = prev.filter(
              (f) => makeFavoriteSpotId(f.lat, f.lng) !== spotKey,
            );
            return [added, ...withoutDup];
          });
        }
      } catch {
        /* unauthorized / offline - silent */
      }
    })();
  }, [
    mapSheet,
    user,
    favoriteSpots,
    currentSheetLabelForFavorite,
  ]);

  /** Forecast pin only for “tap map for forecast” - not when a stocking marker is selected (avoids covering the fish icon). */
  const forecastPin = useMemo(() => {
    if (!mapSheet || placing) return null;
    if (mapSheet.mode !== "forecast") return null;
    return { lat: mapSheet.lat, lng: mapSheet.lng };
  }, [mapSheet, placing]);

  useEffect(() => {
    if (!mapSheet || mapSheet.mode !== "forecast") {
      setForecastAreaLabel(null);
      setForecastAreaLabelLoading(false);
      return;
    }
    const { lat, lng } = mapSheet;
    setForecastAreaLabel(null);
    setForecastAreaLabelLoading(true);
    let cancelled = false;
    const u = new URL("/api/reverse-geocode", window.location.origin);
    u.searchParams.set("lat", String(lat));
    u.searchParams.set("lon", String(lng));
    fetch(u.toString())
      .then((res) => res.json() as Promise<{ label?: string; error?: string }>)
      .then((json) => {
        if (cancelled) return;
        if (typeof json.label === "string" && json.label.length > 0) {
          setForecastAreaLabel(json.label);
        } else {
          setForecastAreaLabel(null);
        }
      })
      .catch(() => {
        if (!cancelled) setForecastAreaLabel(null);
      })
      .finally(() => {
        if (!cancelled) setForecastAreaLabelLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mapSheet]);

  const closeMapSheet = useCallback(() => {
    setMapSheet(null);
    setSheetExpanded(false);
  }, []);

  const handleRemoveFavoriteFromList = useCallback(
    (id: string) => {
      if (!user) return;
      const serverId = Number.parseInt(id, 10);
      if (!Number.isFinite(serverId)) return;
      void (async () => {
        try {
          await deleteMapFavorite(serverId);
          setFavoriteSpots((prev) => prev.filter((f) => f.id !== id));
        } catch {
          /* ignore */
        }
      })();
    },
    [user],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (pendingCatch) {
        setPendingCatch(null);
        e.preventDefault();
        return;
      }
      if (pendingCamp) {
        setPendingCamp(null);
        e.preventDefault();
        return;
      }
      if (placing) {
        setPlacing(false);
        e.preventDefault();
        return;
      }
      if (lakeSuggestionsOpen) {
        setLakeSuggestionsOpen(false);
        e.preventDefault();
        return;
      }
      if (mapSheet) {
        closeMapSheet();
        e.preventDefault();
        return;
      }
      if (lakeSearchPin) {
        clearPlaceSearch();
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    pendingCatch,
    pendingCamp,
    placing,
    lakeSuggestionsOpen,
    mapSheet,
    lakeSearchPin,
    closeMapSheet,
    clearPlaceSearch,
    setLakeSuggestionsOpen,
  ]);

  function handleLogCatchClick() {
    if (!user) return;
    setPlacingMode("catch");
    setPlacing(true);
  }

  function handleLogCampClick() {
    if (!user) return;
    setPlacingMode("camp");
    setPlacing(true);
  }

  useEffect(() => {
    if (!user) {
      setCampSpots([]);
      return;
    }
    let cancelled = false;
    fetchVisibleCampSpots(800)
      .then(async (rows) => {
        if (cancelled) return;

        async function resolveOne(c: CampSpotResponse): Promise<CampSpotResponse> {
          const raw = (c.imageUrls ?? []).slice(0, 4);
          if (raw.length === 0) return c;
          const resolved = await Promise.all(
            raw.map(async (u) => {
              if (!u) return "";
              if (u.startsWith("http://") || u.startsWith("https://")) return u;
              try {
                return await getImageUrl(u);
              } catch {
                return "";
              }
            }),
          );
          return { ...c, imageUrls: resolved.filter(Boolean) };
        }

        const resolvedRows = await Promise.all(rows.map(resolveOne));
        if (!cancelled) setCampSpots(resolvedRows);
      })
      .catch(() => {
        if (!cancelled) setCampSpots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const mapOnboardingReady = hydrated && !loading && species.length > 0;

  // Arriving from "Post a catch" on the home page: pulse the Log button so the jump to the map makes sense.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("log") !== "1") return;
    setHighlightLog(true);
    // Strip the param so a refresh / back navigation doesn't re-trigger the pulse.
    params.delete("log");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
    const timer = window.setTimeout(() => setHighlightLog(false), 4500);
    return () => window.clearTimeout(timer);
  }, []);

  // Stop the pulse as soon as the user opens the Log menu (they found it).
  useEffect(() => {
    if (logMenuOpen) setHighlightLog(false);
  }, [logMenuOpen]);

  return (
    <div className="map-page__root">
      <MapOnboardingDialog t={t} ready={mapOnboardingReady} />
      <Suspense fallback={null}>
        <MapUrlLakePinLoader setLakeSearchPin={setLakeSearchPin} />
      </Suspense>
      <MapPageToolbar
        placing={placing}
        mapSheetExists={!!mapSheet}
        userPresent={!!user}
        catchScope={catchScope}
        setCatchScope={setCatchScope}
        logMenuOpen={logMenuOpen}
        setLogMenuOpen={setLogMenuOpen}
        highlightLog={highlightLog}
        onLogCatch={handleLogCatchClick}
        onLogCamp={handleLogCampClick}
        onCancelPlacing={() => setPlacing(false)}
        onCloseSheet={closeMapSheet}
        clearPinLabel={t("forecast.clearPin")}
        areaSelectMode={areaSelectMode}
        onToggleAreaSelect={toggleAreaSelect}
        areaSelectLabel={t("map.aiSpots.toolbar")}
      />
      <div className="map-page__chrome map-page__search-filters">
        <MapFindPlaceSection
          t={t}
          hydrated={hydrated}
          lakePinQuery={lakePinQuery}
          setLakePinQuery={setLakePinQuery}
          lakePinError={lakePinError}
          lakePinSearching={lakePinSearching}
          lakeSuggestions={lakeSuggestions}
          lakeSuggestionsOpen={lakeSuggestionsOpen}
          setLakeSuggestionsOpen={setLakeSuggestionsOpen}
          lakeSuggestionIndex={lakeSuggestionIndex}
          setLakeSuggestionIndex={setLakeSuggestionIndex}
          onSubmitSearch={handleLakePinSearch}
          onSearchKeyDown={handleLakeSearchKeyDown}
          onSelectSuggestion={selectLakeSuggestion}
          filtersAvailable={species.length > 0}
          filtersExpanded={filtersExpanded}
          setFiltersExpanded={setFiltersExpanded}
        />
        <MapFiltersShell
          hasSpeciesLoaded={species.length > 0}
          filtersExpanded={filtersExpanded}
        >
          <MapMnrfFiltersSection
            t={t}
            locale={locale}
            showStocking={showStocking}
            species={species}
            activeSpecies={activeSpecies}
            toggleAllSpecies={toggleAll}
            toggleSpecies={toggleSpecies}
            recentYearsWindow={recentYearsWindow}
            setRecentYearsWindow={handleRecentYearsChange}
            minTotalFish={minTotalFish}
            setMinTotalFish={handleMinTotalFishChange}
            minSpeciesCount={minSpeciesCount}
            setMinSpeciesCount={handleMinSpeciesCountChange}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={handleDistrictChange}
            districts={districts}
          />
          <MapAraFiltersSection
            t={t}
            showAra={showAra}
            presenceSpecies={presenceSpecies}
            togglePresenceSpecies={togglePresenceSpecies}
            toggleAllPresenceSpecies={toggleAllPresenceSpecies}
            araLoading={araLoading}
            araTooWide={araTooWide}
          />
        </MapFiltersShell>
      </div>

      {/* Map - flex-1 + basis-0 so Leaflet gets a non-zero height inside the scrollable main */}
      <div
        className={[
          "map-page__map-area",
          placing ? "map-page__map-area--placing" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <MapPageLoadingOverlay loading={loading} loadedCount={loaded} locale={locale} />

        {/* Placing-mode banner */}
        {placing ? <MapPagePlacingBanner placingMode={placingMode} /> : null}

        <MapAiSpotsPanel
          t={t}
          active={areaSelectMode}
          hasBounds={!!areaBounds}
          drawArmed={areaDrawArmed}
          onArmDraw={() => setAreaDrawArmed((v) => !v)}
          loading={aiSpotsLoading}
          error={aiSpotsError}
          narrative={aiSpotsNarrative}
          spotCount={aiSpots.length}
          onAsk={() => void askAreaSpots()}
          onClear={() => {
            clearAiSpots();
            setAreaBounds(null);
          }}
          onCancel={exitAreaSelect}
        />

        {/* Logged out: small floating login pill instead of the old toolbar row */}
        {!user ? (
          <Link
            href="/login"
            className="map-page__login-float"
            onClick={() => trackUsage("map_login_pill")}
          >
            Log in to add catches
          </Link>
        ) : null}

        <StockingMapDynamic
          groups={displayStockingGroups}
          activeSpecies={activeSpecies}
          onMapClick={handleMapClick}
          placing={placing}
          forecastPin={forecastPin}
          onStockingLakeClick={handleStockingLakeClick}
          catchMarkers={showCatches ? catchMarkers : []}
          catchScope={catchScope}
          friendIds={friendIds}
          currentUserId={user?.id}
          anonCatchRegions={user ? [] : anonCatchRegions}
          anonCatchLabels={anonCatchLabels}
          araMarkers={araPoints}
          onAraMarkerClick={handleAraMarkerClick}
          onViewportChange={loadAra}
          satelliteImagery={satelliteImagery}
          searchPin={lakeSearchPin}
          bathymetryEnabled={showBathymetry}
          favoriteSpots={favoriteSpots}
          onFavoriteSpotClick={handleFavoriteSpotClick}
          campSpots={campSpots}
          campVisible={showCamps}
          onCampMarkerClick={(camp, lat, lng) => {
            setMapSheet({ mode: "camp", camp, lat, lng });
            setSheetExpanded(true);
          }}
          areaSelectMode={areaSelectMode}
          areaDrawArmed={areaDrawArmed}
          onAreaDrawArmedChange={setAreaDrawArmed}
          areaBounds={areaBounds}
          onAreaBoundsChange={setAreaBounds}
          aiSpots={aiSpots}
        />

        <MapPageLayersPanel
          t={t}
          layersPanelExpanded={layersPanelExpanded}
          setLayersPanelExpanded={setLayersPanelExpanded}
          satelliteImagery={satelliteImagery}
          setSatelliteImagery={setSatelliteImagery}
          showStocking={showStocking}
          setShowStocking={setShowStocking}
          showAra={showAra}
          setShowAra={setShowAra}
          showCatches={showCatches}
          setShowCatches={setShowCatches}
          showCamps={showCamps}
          setShowCamps={setShowCamps}
          showBathymetry={showBathymetry}
          setShowBathymetry={setShowBathymetry}
          showMapLegend={showMapLegend}
          setShowMapLegend={setShowMapLegend}
          favoriteSpots={favoriteSpots}
          onRemoveFavorite={handleRemoveFavoriteFromList}
          hydrated={hydrated}
          userPresent={!!user}
        />

        {mapSheet && !placing ? (
          <MapPageDetailSheet
            mapSheet={mapSheet}
            forecastAreaLabel={forecastAreaLabel}
            forecastAreaLabelLoading={forecastAreaLabelLoading}
            sheetExpanded={sheetExpanded}
            setSheetExpanded={setSheetExpanded}
            onClose={closeMapSheet}
            userPresent={!!user}
            canUseAi={!!user}
            currentSheetIsFavorite={currentSheetIsFavorite}
            handleToggleMapFavorite={handleToggleMapFavorite}
            deletingCampId={deletingCampId}
            setDeletingCampId={setDeletingCampId}
            setCampSpots={setCampSpots}
            setMapSheet={setMapSheet}
            isAdmin={isAdmin}
            userAccountId={user?.id}
          />
        ) : null}

        <MapPageLegend
          t={t}
          visible={showMapLegend}
          layersPanelExpanded={layersPanelExpanded}
        />

      </div>

      {/* Catch registration form */}
      <MapPagePendingForms
        pendingCatch={pendingCatch}
        pendingCamp={pendingCamp}
        onCatchClose={() => setPendingCatch(null)}
        onCatchSuccess={async (info) => {
          if (!user) {
            setPendingCatch(null);
            return;
          }
          let resolvedUrl: string | undefined;
          if (info.imageUrl) {
            try {
              resolvedUrl = await getImageUrl(info.imageUrl);
            } catch {
              /* ignore */
            }
          }
          const newCatch = {
            species: info.species,
            quantity:
              info.fishDetails.length > 1 ? info.fishDetails.length : undefined,
            imageUrl: resolvedUrl,
            fishDetails: info.fishDetails,
          };
          setCatchMarkers((prev) => {
            const existing = prev.find(
              (marker) =>
                marker.accountId === user.id &&
                marker.lat.toFixed(6) === info.lat.toFixed(6) &&
                marker.lng.toFixed(6) === info.lng.toFixed(6),
            );
            if (existing) {
              return prev.map((marker) =>
                marker === existing
                  ? {
                      ...marker,
                      catches: [...marker.catches, newCatch],
                    }
                  : marker,
              );
            }
            return [
              ...prev,
              {
                lat: info.lat,
                lng: info.lng,
                accountId: user.id,
                username: user.username,
                locationName: info.locationName,
                catches: [newCatch],
              },
            ];
          });
          setPendingCatch(null);
        }}
        onCampClose={() => setPendingCamp(null)}
        onCampSuccess={async (saved) => {
          const raw = (saved.imageUrls ?? []).slice(0, 4);
          let resolved: string[] = [];
          if (raw.length > 0) {
            const out = await Promise.all(
              raw.map(async (u) => {
                if (!u) return "";
                if (u.startsWith("http://") || u.startsWith("https://")) return u;
                try {
                  return await getImageUrl(u);
                } catch {
                  return "";
                }
              }),
            );
            resolved = out.filter(Boolean);
          }
          const normalized: CampSpotResponse =
            raw.length > 0 ? { ...saved, imageUrls: resolved } : saved;
          setCampSpots((prev) => [normalized, ...prev.filter((c) => c.id !== saved.id)]);
          setPendingCamp(null);
        }}
      />
    </div>
  );
}
