"use client";

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
import { MapFindPlaceSection } from "@/components/map-page/map-find-place-section";
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
import { MapPageToolbar } from "@/components/map-page/map-page-toolbar";
import { MapOnboardingDialog } from "@/components/map-page/map-onboarding-dialog";
import { MapUrlLakePinLoader } from "@/components/map-page/map-url-lake-pin-loader";
import { StockingMapDynamic } from "@/components/map-page/map-stock-map";
import { useMapPlaceSearch } from "@/components/map-page/use-map-place-search";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import type { CatchMapMarker } from "@/components/stocking-map";
import {
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
import { haversineDistanceKm } from "@/lib/geo-distance";
import { initialActiveSpeciesFromPreferences } from "@/lib/fish-species-preferences";
import { useSyncedBooleanPref } from "@/lib/use-synced-boolean-pref";
import {
  loadMapFavorites,
  makeFavoriteSpotId,
  saveMapFavorites,
  type FavoriteSpot,
} from "@/lib/map-favorites";

export default function MapPage() {
  const { user, isAdmin } = useAuth();
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
  const [logMenuOpen, setLogMenuOpen] = useState(false);
  const [mapSheet, setMapSheet] = useState<MapSheetState>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [forecastAreaLabel, setForecastAreaLabel] = useState<string | null>(null);
  const [forecastAreaLabelLoading, setForecastAreaLabelLoading] = useState(false);
  const [pendingCatch, setPendingCatch] = useState<PendingCatch | null>(null);
  const [pendingCamp, setPendingCamp] = useState<PendingCamp | null>(null);
  const [catchMarkers, setCatchMarkers] = useState<CatchMapMarker[]>([]);
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [catchScope, setCatchScope] = useState<"all" | "friends" | "mine">("mine");
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
    "off-unless-true",
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

  const toggleSpecies = useCallback((sp: string) => {
    setActiveSpecies((prev) => {
      const next = new Set(prev);
      if (next.has(sp)) next.delete(sp);
      else next.add(sp);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setActiveSpecies((prev) =>
      prev.size === species.length ? new Set() : new Set(species),
    );
  }, [species]);

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

  const filterSummaryLine = useMemo(() => {
    if (species.length === 0) return "";
    const spLabel =
      activeSpecies.size === species.length
        ? t("map.summary.allSpecies")
        : t("map.summary.speciesCount", { count: activeSpecies.size });
    const stock =
      showStocking && activeSpecies.size > 0
        ? t("map.summary.lakesMatch", { count: filteredGroups.length })
        : !showStocking
          ? t("map.summary.stockingOff")
          : t("map.summary.noSpeciesSelected");
    const ara = showAra ? ` · ${t("map.summary.araOn")}` : "";
    return `${stock} · ${spLabel}${ara}`;
  }, [
    species.length,
    filteredGroups.length,
    activeSpecies.size,
    showStocking,
    showAra,
    t,
  ]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
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
    [placing, placingMode],
  );

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

  return (
    <div className="map-page__root">
      <MapOnboardingDialog t={t} ready={mapOnboardingReady} />
      <Suspense fallback={null}>
        <MapUrlLakePinLoader setLakeSearchPin={setLakeSearchPin} />
      </Suspense>
      <MapPageToolbar
        toolbarSubtitle={
          <>
            {loading
              ? `Loading Ontario fish stocking data… ${formatAppInteger(loaded, locale)} records`
              : error
                ? error
                : `${formatAppInteger(records.length, locale)} stocking records across ${formatAppInteger(groups.length, locale)} waterbodies (last 5 years)`}
            {!loading && !error && !placing ? (
              <>
                {" "}
                <span className="text-sky-700 dark:text-sky-400">
                  {t("forecast.mapHintBottomSheet")}
                </span>
              </>
            ) : null}
          </>
        }
        placing={placing}
        mapSheetExists={!!mapSheet}
        userPresent={!!user}
        catchScope={catchScope}
        setCatchScope={setCatchScope}
        logMenuOpen={logMenuOpen}
        setLogMenuOpen={setLogMenuOpen}
        onLogCatch={handleLogCatchClick}
        onLogCamp={handleLogCampClick}
        onCancelPlacing={() => setPlacing(false)}
        onCloseSheet={closeMapSheet}
        clearPinLabel={t("forecast.clearPin")}
      />

      {/* Species filter (collapsible) */}
      <MapFiltersShell
        hasSpeciesLoaded={species.length > 0}
        filtersExpanded={filtersExpanded}
        setFiltersExpanded={setFiltersExpanded}
        filterSummaryLine={filterSummaryLine}
      >
        <MapFindPlaceSection
          t={t}
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
        />
        <MapMnrfFiltersSection
          t={t}
          locale={locale}
          showStocking={showStocking}
          species={species}
          activeSpecies={activeSpecies}
          toggleAllSpecies={toggleAll}
          toggleSpecies={toggleSpecies}
          recentYearsWindow={recentYearsWindow}
          setRecentYearsWindow={setRecentYearsWindow}
          minTotalFish={minTotalFish}
          setMinTotalFish={setMinTotalFish}
          minSpeciesCount={minSpeciesCount}
          setMinSpeciesCount={setMinSpeciesCount}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
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

      {/* Map - flex-1 + basis-0 so Leaflet gets a non-zero height inside the scrollable main */}
      <div
        className={["map-page__map-area", placing ? "map-page__map-area--placing" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        <MapPageLoadingOverlay loading={loading} loadedCount={loaded} locale={locale} />

        {/* Placing-mode banner */}
        {placing ? <MapPagePlacingBanner placingMode={placingMode} /> : null}

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
