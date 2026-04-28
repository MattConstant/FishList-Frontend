"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import CatchForm from "@/components/catch-form";
import { MapDetailBottomSheet } from "@/components/map-detail-bottom-sheet";
import { useLocale } from "@/contexts/locale-context";
import type { CatchMapMarker } from "@/components/stocking-map";
import { fetchLatestPosts, fetchMyFriends, getImageUrl, type FishEntryPayload } from "@/lib/api";
import {
  allDevelopmentalStages,
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
import { translateStockingSpecies } from "@/lib/species-i18n";

const StockingMap = dynamic(() => import("@/components/stocking-map"), {
  ssr: false,
  loading: () => (
    <div className="map-page__stocking-loading">Initializing map…</div>
  ),
});

type PendingCatch = { lat: number; lng: number };

const MAP_FILTERS_EXPANDED_KEY = "fishlist-map-filters-expanded";

function segmentBtnClass(on: boolean) {
  return ["map-page__segment-btn", on ? "map-page__segment-btn--active" : ""]
    .filter(Boolean)
    .join(" ");
}

function speciesPillClass(active: boolean) {
  return ["map-page__species-pill", active ? "map-page__species-pill--active" : ""]
    .filter(Boolean)
    .join(" ");
}

export default function MapPage() {
  const { user } = useAuth();
  const { t, locale } = useLocale();
  const [records, setRecords] = useState<StockingRecord[]>([]);
  const [groups, setGroups] = useState<WaterbodyGroup[]>([]);
  const [species, setSpecies] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [developmentalStages, setDevelopmentalStages] = useState<string[]>([]);
  const [activeSpecies, setActiveSpecies] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [waterbodyQuery, setWaterbodyQuery] = useState("");
  const [lakePinQuery, setLakePinQuery] = useState("");
  const [lakePinError, setLakePinError] = useState("");
  const [lakePinSearching, setLakePinSearching] = useState(false);
  const [lakeSearchPin, setLakeSearchPin] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  type LakeSuggestion = {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string | null;
    country?: string;
  };
  const [lakeSuggestions, setLakeSuggestions] = useState<LakeSuggestion[]>([]);
  const [lakeSuggestionsOpen, setLakeSuggestionsOpen] = useState(false);
  const [lakeSuggestionIndex, setLakeSuggestionIndex] = useState(-1);
  const lakeSearchAbortRef = useRef<AbortController | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedDevelopmentalStage, setSelectedDevelopmentalStage] = useState("all");
  const [recentYearsWindow, setRecentYearsWindow] = useState<1 | 2 | 5>(5);
  const [minTotalFish, setMinTotalFish] = useState<0 | 500 | 1000 | 5000>(0);
  const [minSpeciesCount, setMinSpeciesCount] = useState<1 | 2 | 3>(1);

  const [placing, setPlacing] = useState(false);
  const [mapSheet, setMapSheet] = useState<
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
  >(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [forecastAreaLabel, setForecastAreaLabel] = useState<string | null>(null);
  const [forecastAreaLabelLoading, setForecastAreaLabelLoading] = useState(false);
  const [pendingCatch, setPendingCatch] = useState<PendingCatch | null>(null);
  const [catchMarkers, setCatchMarkers] = useState<CatchMapMarker[]>([]);
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [catchScope, setCatchScope] = useState<"all" | "friends" | "mine">("mine");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const skipFiltersExpandedSave = useRef(true);

  const [showStocking, setShowStocking] = useState(true);
  const [showAra, setShowAra] = useState(false);
  const [satelliteImagery, setSatelliteImagery] = useState(false);
  const [presenceSpecies, setPresenceSpecies] = useState<Set<AraSpeciesFilter>>(
    () => new Set(ARA_SPECIES_FILTERS),
  );
  const [araPoints, setAraPoints] = useState<AraMapPoint[]>([]);
  const [araLoading, setAraLoading] = useState(false);
  const [araTooWide, setAraTooWide] = useState(false);
  const lastAraViewRef = useRef<AraViewport | null>(null);
  const araFetchGen = useRef(0);

  useEffect(() => {
    try {
      if (localStorage.getItem(MAP_FILTERS_EXPANDED_KEY) === "true") {
        setFiltersExpanded(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (skipFiltersExpandedSave.current) {
      skipFiltersExpandedSave.current = false;
      return;
    }
    try {
      localStorage.setItem(MAP_FILTERS_EXPANDED_KEY, String(filtersExpanded));
    } catch {
      /* ignore */
    }
  }, [filtersExpanded]);

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
        setDevelopmentalStages(allDevelopmentalStages(data));
        setActiveSpecies(new Set(sp));
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
        // silently fail — catch markers are nice-to-have
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
    const text = waterbodyQuery.trim().toLowerCase();
    const allSpeciesSelected = activeSpecies.size === species.length;

    return groups.filter((g) => {
      if (text && !g.waterbody.toLowerCase().includes(text)) return false;
      if (g.totalFish < minTotalFish) return false;
      if (g.speciesSet.size < minSpeciesCount) return false;
      if (selectedDistrict !== "all" && !g.districtSet.has(selectedDistrict)) {
        return false;
      }
      if (
        selectedDevelopmentalStage !== "all" &&
        !g.developmentalStageSet.has(selectedDevelopmentalStage)
      ) {
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
    waterbodyQuery,
    selectedDistrict,
    selectedDevelopmentalStage,
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
    const q = waterbodyQuery.trim();
    const quote = locale === "fr" ? "«" : "“";
    const quoteEnd = locale === "fr" ? "»" : "”";
    const tail = q ? ` · ${quote}${q}${quoteEnd}` : "";
    const stock =
      showStocking && activeSpecies.size > 0
        ? t("map.summary.lakesMatch", { count: filteredGroups.length })
        : !showStocking
          ? t("map.summary.stockingOff")
          : t("map.summary.noSpeciesSelected");
    const ara = showAra ? ` · ${t("map.summary.araOn")}` : "";
    return `${stock} · ${spLabel}${ara}${tail}`;
  }, [
    species.length,
    filteredGroups.length,
    activeSpecies.size,
    waterbodyQuery,
    showStocking,
    showAra,
    locale,
    t,
  ]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (placing) {
        setPlacing(false);
        setPendingCatch({ lat, lng });
        return;
      }
      setMapSheet({ mode: "forecast", lat, lng });
      setSheetExpanded(false);
    },
    [placing],
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
    setSheetExpanded(true);
  }, []);

  /** Forecast pin only for “tap map for forecast” — not when a stocking marker is selected (avoids covering the fish icon). */
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

  function handleLogCatchClick() {
    if (!user) return;
    setPlacing(true);
  }

  useEffect(() => {
    const q = lakePinQuery.trim();
    if (q.length < 2) {
      setLakeSuggestions([]);
      setLakeSuggestionsOpen(false);
      setLakeSuggestionIndex(-1);
      lakeSearchAbortRef.current?.abort();
      return;
    }
    const controller = new AbortController();
    lakeSearchAbortRef.current?.abort();
    lakeSearchAbortRef.current = controller;
    setLakePinSearching(true);
    setLakePinError("");
    const handle = setTimeout(async () => {
      try {
        const url = new URL("/api/geocode-search", window.location.origin);
        url.searchParams.set("q", q);
        url.searchParams.set("lang", locale === "fr" ? "fr" : "en");
        const res = await fetch(url.toString(), { signal: controller.signal });
        const data = (await res.json()) as { results?: LakeSuggestion[] };
        const hits = data.results ?? [];
        const waterHint = /(lake|lac|river|rivière|pond|bay|reservoir|water)/i;
        const sorted = [...hits].sort((a, b) => {
          const aWater = waterHint.test(a.name) ? 1 : 0;
          const bWater = waterHint.test(b.name) ? 1 : 0;
          if (aWater !== bWater) return bWater - aWater;
          const aCa = a.country?.toLowerCase() === "canada" ? 1 : 0;
          const bCa = b.country?.toLowerCase() === "canada" ? 1 : 0;
          return bCa - aCa;
        });
        setLakeSuggestions(sorted);
        setLakeSuggestionsOpen(sorted.length > 0);
        setLakeSuggestionIndex(sorted.length > 0 ? 0 : -1);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setLakeSuggestions([]);
        setLakeSuggestionsOpen(false);
      } finally {
        setLakePinSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [lakePinQuery, locale]);

  function selectLakeSuggestion(s: LakeSuggestion) {
    setLakeSearchPin({
      lat: s.latitude,
      lng: s.longitude,
      label: s.admin1 ? `${s.name}, ${s.admin1}` : s.name,
    });
    setLakePinQuery(s.admin1 ? `${s.name}, ${s.admin1}` : s.name);
    setLakeSuggestionsOpen(false);
    setLakePinError("");
  }

  function handleLakePinSearch(e: FormEvent) {
    e.preventDefault();
    if (lakeSuggestionIndex >= 0 && lakeSuggestions[lakeSuggestionIndex]) {
      selectLakeSuggestion(lakeSuggestions[lakeSuggestionIndex]);
      return;
    }
    if (lakeSuggestions.length > 0) {
      selectLakeSuggestion(lakeSuggestions[0]);
      return;
    }
    if (lakePinQuery.trim().length < 2) {
      setLakePinError(t("map.searchLake.minChars"));
      return;
    }
    setLakePinError(t("map.searchLake.notFound"));
  }

  function handleLakeSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!lakeSuggestionsOpen || lakeSuggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setLakeSuggestionIndex((i) => (i + 1) % lakeSuggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setLakeSuggestionIndex(
        (i) => (i - 1 + lakeSuggestions.length) % lakeSuggestions.length,
      );
    } else if (e.key === "Escape") {
      setLakeSuggestionsOpen(false);
    }
  }

  return (
    <div className="map-page__root">
      {/* Header */}
      <div className="map-page__toolbar map-page__chrome">
        <div className="min-w-0">
          <h1 className="map-page__toolbar-title">Stocked Lakes Map</h1>
          <p className="map-page__toolbar-desc">
            {loading
              ? `Loading Ontario fish stocking data… ${loaded.toLocaleString()} records`
              : error
                ? error
                : `${records.length.toLocaleString()} stocking records across ${groups.length.toLocaleString()} waterbodies (last 5 years)`}
            {!loading && !error && !placing ? (
              <>
                {" "}
                <span className="text-sky-700 dark:text-sky-400">
                  {t("forecast.mapHintBottomSheet")}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="map-page__toolbar-actions">
          {user && (
            <div className="map-page__segment-wrap">
              <button
                type="button"
                onClick={() => setCatchScope("all")}
                className={segmentBtnClass(catchScope === "all")}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setCatchScope("friends")}
                className={segmentBtnClass(catchScope === "friends")}
              >
                Friends + Me
              </button>
              <button
                type="button"
                onClick={() => setCatchScope("mine")}
                className={segmentBtnClass(catchScope === "mine")}
              >
                My posts
              </button>
            </div>
          )}
          {user ? (
            <button
              type="button"
              onClick={handleLogCatchClick}
              disabled={placing}
              className={[
                "map-page__log-catch",
                placing ? "map-page__log-catch--placing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {placing ? (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.145c.182-.1.42-.244.697-.424a16.293 16.293 0 002.278-1.885C15.57 14.587 18 11.512 18 8A8 8 0 002 8c0 3.512 2.43 6.587 4.41 8.468a16.293 16.293 0 002.278 1.885 10.41 10.41 0 00.978.569l.018.008.006.003zM10 11a3 3 0 100-6 3 3 0 000 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Click on the map…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                  </svg>
                  Log a Catch
                </>
              )}
            </button>
          ) : (
            <Link href="/login" className="map-page__login-link">
              Log in to add catches
            </Link>
          )}
          {placing && (
            <button
              type="button"
              onClick={() => setPlacing(false)}
              className="map-page__cancel-btn"
            >
              Cancel
            </button>
          )}
          {mapSheet && !placing && (
            <button
              type="button"
              onClick={closeMapSheet}
              className="map-page__cancel-btn"
            >
              {t("forecast.clearPin")}
            </button>
          )}
        </div>
      </div>

      {/* Species filter (collapsible) */}
      {species.length > 0 && (
        <div className="map-page__filter-shell map-page__chrome">
          <div
            className={[
              "map-page__filter-bar",
              filtersExpanded ? "map-page__filter-bar--expanded" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="map-page__filter-toggle"
              aria-expanded={filtersExpanded}
              aria-controls="map-filters-panel"
              id="map-filters-toggle"
            >
              <span className="map-page__filter-heading">Filters</span>
              {!filtersExpanded && (
                <span className="map-page__filter-summary">{filterSummaryLine}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFiltersExpanded((v) => !v)}
              className="map-page__filter-chevron-btn"
              aria-expanded={filtersExpanded}
              aria-label={filtersExpanded ? "Collapse filters" : "Expand filters"}
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-5 w-5 transition-transform ${filtersExpanded ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          {filtersExpanded ? (
            <div
              id="map-filters-panel"
              role="region"
              aria-labelledby="map-filters-toggle"
              className="map-page__filter-panel"
            >
              <section
                className="map-page__filter-section"
                aria-label={t("map.mnrf.section")}
              >
                <div className="map-page__filter-section-head">
                  <h3 className="map-page__filter-section-title">
                    {t("map.searchLake.section")}
                  </h3>
                  <span className="map-page__filter-info">
                    <button
                      type="button"
                      className="map-page__filter-info-icon"
                      aria-label={t("map.searchLake.info")}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.25 9a.75.75 0 01.75-.75h.01a.75.75 0 01.74.84l-.46 4.13a.75.75 0 11-1.49-.16l.45-4.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <span className="map-page__filter-info-tooltip" role="tooltip">
                      {t("map.searchLake.info")}
                    </span>
                  </span>
                </div>
                <form
                  className="map-page__lake-pin-form"
                  onSubmit={handleLakePinSearch}
                  role="search"
                >
                  <div className="map-page__lake-pin-search">
                    <span className="map-page__lake-pin-search-icon" aria-hidden>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path
                          fillRule="evenodd"
                          d="M9 3a6 6 0 104.472 10.03l3.249 3.249a1 1 0 001.414-1.414l-3.249-3.249A6 6 0 009 3zM5 9a4 4 0 118 0 4 4 0 01-8 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <input
                      id="map-waterbody-pin"
                      type="text"
                      value={lakePinQuery}
                      onChange={(e) => setLakePinQuery(e.target.value)}
                      onFocus={() => {
                        if (lakeSuggestions.length > 0) setLakeSuggestionsOpen(true);
                      }}
                      onBlur={() => {
                        window.setTimeout(() => setLakeSuggestionsOpen(false), 120);
                      }}
                      onKeyDown={handleLakeSearchKeyDown}
                      placeholder={t("map.searchLake.placeholder")}
                      className="map-page__field map-page__lake-pin-input w-full"
                      autoComplete="off"
                      role="combobox"
                      aria-expanded={lakeSuggestionsOpen}
                      aria-controls="map-waterbody-pin-list"
                      aria-autocomplete="list"
                    />
                    {lakePinSearching && (
                      <span className="map-page__lake-pin-spinner" aria-hidden>
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
                          <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            className="opacity-25"
                          />
                          <path
                            d="M12 2a10 10 0 019.95 9"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            className="opacity-75"
                          />
                        </svg>
                      </span>
                    )}
                    {lakeSuggestionsOpen && lakeSuggestions.length > 0 && (
                      <ul
                        id="map-waterbody-pin-list"
                        className="map-page__lake-pin-suggestions"
                        role="listbox"
                      >
                        {lakeSuggestions.map((s, idx) => (
                          <li
                            key={`${s.id}-${s.latitude}-${s.longitude}`}
                            role="option"
                            aria-selected={idx === lakeSuggestionIndex}
                            className={[
                              "map-page__lake-pin-suggestion",
                              idx === lakeSuggestionIndex
                                ? "map-page__lake-pin-suggestion--active"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectLakeSuggestion(s);
                            }}
                            onMouseEnter={() => setLakeSuggestionIndex(idx)}
                          >
                            <span className="map-page__lake-pin-suggestion-name">{s.name}</span>
                            <span className="map-page__lake-pin-suggestion-meta">
                              {[s.admin1, s.country].filter(Boolean).join(" · ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="map-page__lake-pin-btn"
                    disabled={lakePinSearching || lakePinQuery.trim().length < 2}
                    aria-label={t("map.searchLake.action")}
                    title={t("map.searchLake.action")}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-4 w-4">
                      <path
                        fillRule="evenodd"
                        d="M9 3a6 6 0 104.472 10.03l3.249 3.249a1 1 0 001.414-1.414l-3.249-3.249A6 6 0 009 3zM5 9a4 4 0 118 0 4 4 0 01-8 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </form>
                {lakePinError ? (
                  <p className="map-page__filter-ara-status">{lakePinError}</p>
                ) : null}
              </section>

              <section
                className="map-page__filter-section"
                aria-label={t("map.mnrf.section")}
              >
                <div className="map-page__filter-section-head">
                  <h3 className="map-page__filter-section-title">
                    {t("map.mnrf.section")}
                  </h3>
                  <span className="map-page__filter-info">
                    <button
                      type="button"
                      className="map-page__filter-info-icon"
                      aria-label={t("map.mnrf.info")}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.25 9a.75.75 0 01.75-.75h.01a.75.75 0 01.74.84l-.46 4.13a.75.75 0 11-1.49-.16l.45-4.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <span className="map-page__filter-info-tooltip" role="tooltip">
                      {t("map.mnrf.info")}
                    </span>
                  </span>
                </div>
                <div className="map-page__filter-toggle-block">
                  <label className="map-page__filter-toggle-row cursor-pointer">
                    <input
                      type="checkbox"
                      className="map-page__filter-check"
                      checked={showStocking}
                      onChange={(e) => setShowStocking(e.target.checked)}
                    />
                    <span className="map-page__filter-toggle-text">
                      <span className="map-page__filter-toggle-name">
                        {t("map.layer.showOnMap")}
                      </span>
                      <span className="map-page__filter-toggle-blurb">
                        {t("map.mnrf.toggleBlurb")}
                      </span>
                    </span>
                  </label>
                </div>

                {showStocking ? (
                  <>
                    <p className="map-page__filter-label--field mt-2 w-full">
                      {t("map.sections.speciesPills")}
                    </p>
                    <div className="map-page__filter-species-row mt-1">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className={speciesPillClass(activeSpecies.size === species.length)}
                      >
                        {t("map.species.all")}
                      </button>
                      {species.map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => toggleSpecies(sp)}
                          className={speciesPillClass(activeSpecies.has(sp))}
                          title={
                            translateStockingSpecies(sp, locale) !== sp
                              ? sp
                              : undefined
                          }
                        >
                          {translateStockingSpecies(sp, locale)}
                        </button>
                      ))}
                    </div>

                    <div className="map-page__filter-field map-page__filter-field--span2 mt-2">
                      <label
                        className="map-page__filter-label--field"
                        htmlFor="map-waterbody-filter"
                      >
                        {t("map.form.waterbody")}
                      </label>
                      <input
                        id="map-waterbody-filter"
                        type="text"
                        value={waterbodyQuery}
                        onChange={(e) => setWaterbodyQuery(e.target.value)}
                        placeholder={t("map.form.waterbodyPh")}
                        className="map-page__field map-page__field--waterbody w-full"
                      />
                    </div>

                    <div className="map-page__filter-form-grid mt-2">
                      <div className="map-page__filter-field">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-recent-years"
                        >
                          {t("map.form.recent")}
                        </label>
                        <div className="map-page__field-wrap">
                          <select
                            id="map-recent-years"
                            value={recentYearsWindow}
                            onChange={(e) =>
                              setRecentYearsWindow(Number(e.target.value) as 1 | 2 | 5)
                            }
                            className="map-page__field w-full"
                          >
                            <option value={1}>Last 1 year</option>
                            <option value={2}>Last 2 years</option>
                            <option value={5}>Last 5 years</option>
                          </select>
                        </div>
                      </div>
                      <div className="map-page__filter-field">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-min-fish"
                        >
                          {t("map.form.minFish")}
                        </label>
                        <div className="map-page__field-wrap">
                          <select
                            id="map-min-fish"
                            value={minTotalFish}
                            onChange={(e) =>
                              setMinTotalFish(
                                Number(e.target.value) as 0 | 500 | 1000 | 5000,
                              )
                            }
                            className="map-page__field w-full"
                          >
                            <option value={0}>Any</option>
                            <option value={500}>500+</option>
                            <option value={1000}>1,000+</option>
                            <option value={5000}>5,000+</option>
                          </select>
                        </div>
                      </div>
                      <div className="map-page__filter-field">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-min-species"
                        >
                          {t("map.form.minSpecies")}
                        </label>
                        <div className="map-page__field-wrap">
                          <select
                            id="map-min-species"
                            value={minSpeciesCount}
                            onChange={(e) =>
                              setMinSpeciesCount(Number(e.target.value) as 1 | 2 | 3)
                            }
                            className="map-page__field w-full"
                          >
                            <option value={1}>1+</option>
                            <option value={2}>2+</option>
                            <option value={3}>3+</option>
                          </select>
                        </div>
                      </div>
                      <div className="map-page__filter-field">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-district"
                        >
                          {t("map.form.district")}
                        </label>
                        <div className="map-page__field-wrap">
                          <select
                            id="map-district"
                            value={selectedDistrict}
                            onChange={(e) => setSelectedDistrict(e.target.value)}
                            className="map-page__field w-full"
                          >
                            <option value="all">All districts</option>
                            {districts.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="map-page__filter-field sm:col-span-2">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-stage"
                        >
                          {t("map.form.stage")}
                        </label>
                        <div className="map-page__field-wrap">
                          <select
                            id="map-stage"
                            value={selectedDevelopmentalStage}
                            onChange={(e) => setSelectedDevelopmentalStage(e.target.value)}
                            className="map-page__field w-full"
                          >
                            <option value="all">All stages</option>
                            {developmentalStages.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </section>

              <section
                className="map-page__filter-section"
                aria-label={t("map.ara.section")}
              >
                <div className="map-page__filter-section-head">
                  <h3 className="map-page__filter-section-title">
                    {t("map.ara.section")}
                  </h3>
                  <span className="map-page__filter-info">
                    <button
                      type="button"
                      className="map-page__filter-info-icon"
                      aria-label={t("map.ara.info")}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.25 9a.75.75 0 01.75-.75h.01a.75.75 0 01.74.84l-.46 4.13a.75.75 0 11-1.49-.16l.45-4.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <span className="map-page__filter-info-tooltip" role="tooltip">
                      {t("map.ara.info")}
                    </span>
                  </span>
                </div>
                <div className="map-page__filter-toggle-block">
                  <label className="map-page__filter-toggle-row cursor-pointer">
                    <input
                      type="checkbox"
                      className="map-page__filter-check"
                      checked={showAra}
                      onChange={(e) => setShowAra(e.target.checked)}
                    />
                    <span className="map-page__filter-toggle-text">
                      <span className="map-page__filter-toggle-name">
                        {t("map.layer.showOnMap")}
                      </span>
                      <span className="map-page__filter-toggle-blurb">
                        {t("map.ara.toggleBlurb")}
                      </span>
                    </span>
                  </label>
                </div>

                {showAra ? (
                  <div className="map-page__filter-substack" aria-live="polite">
                    <p className="map-page__filter-label--field w-full pt-1 pl-0.5">
                      {t("map.ara.pillHeading")}
                    </p>
                    <div className="map-page__filter-species-row">
                      <button
                        type="button"
                        className={speciesPillClass(
                          presenceSpecies.size === ARA_SPECIES_FILTERS.length,
                        )}
                        onClick={toggleAllPresenceSpecies}
                      >
                        {t("map.species.all")}
                      </button>
                      {ARA_SPECIES_FILTERS.map((speciesKey) => (
                        <button
                          key={speciesKey}
                          type="button"
                          className={speciesPillClass(presenceSpecies.has(speciesKey))}
                          aria-pressed={presenceSpecies.has(speciesKey)}
                          onClick={() => togglePresenceSpecies(speciesKey)}
                        >
                          {t(`map.ara.species.${speciesKey}`)}
                        </button>
                      ))}
                    </div>
                    {araLoading || araTooWide ? (
                      <div className="map-page__filter-ara-status">
                        {araLoading ? (
                          <span className="text-sky-600 dark:text-sky-400/90">
                            {t("map.ara.loading")}
                          </span>
                        ) : (
                          <span className="text-amber-800/95 dark:text-amber-300/90">
                            {t("map.ara.tooWide")}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </div>
      )}

      {/* Map — flex-1 + basis-0 so Leaflet gets a non-zero height inside the scrollable main */}
      <div
        className={["map-page__map-area", placing ? "map-page__map-area--placing" : ""]
          .filter(Boolean)
          .join(" ")}
      >
        {loading && (
          <div className="map-page__loading-overlay">
            <div className="flex flex-col items-center gap-2">
              <svg
                className="h-8 w-8 animate-spin text-sky-600"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M12 2a10 10 0 019.95 9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
              <p className="map-page__loading-status">
                {loaded.toLocaleString()} records loaded…
              </p>
            </div>
          </div>
        )}

        {/* Placing-mode banner */}
        {placing && (
          <div className="map-page__placing-banner">
            Click anywhere on the map to place your catch
          </div>
        )}

        <StockingMap
          groups={displayStockingGroups}
          activeSpecies={activeSpecies}
          onMapClick={handleMapClick}
          placing={placing}
          forecastPin={forecastPin}
          onStockingLakeClick={handleStockingLakeClick}
          catchMarkers={catchMarkers}
          catchScope={catchScope}
          friendIds={friendIds}
          currentUserId={user?.id}
          araMarkers={araPoints}
          onAraMarkerClick={handleAraMarkerClick}
          onViewportChange={loadAra}
          satelliteImagery={satelliteImagery}
          searchPin={lakeSearchPin}
        />
        <div
          className="map-page__map-basemap"
          role="group"
          aria-label={t("map.basemap.section")}
          title={t("map.basemap.satelliteBlurb")}
        >
          <label className="map-page__map-basemap-label" htmlFor="map-satellite-toggle">
            <input
              id="map-satellite-toggle"
              type="checkbox"
              className="map-page__map-basemap-check"
              checked={satelliteImagery}
              onChange={(e) => setSatelliteImagery(e.target.checked)}
            />
            <span className="map-page__map-basemap-text">
              {t("map.basemap.satellite")}
            </span>
          </label>
        </div>
        {mapSheet && !placing ? (
          <MapDetailBottomSheet
            key={
              mapSheet.mode === "lake"
                ? `lake-${mapSheet.group.waterbody}-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`
                : mapSheet.mode === "presence"
                  ? `presence-${mapSheet.name}-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`
                  : `fc-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`
            }
            mode={mapSheet.mode}
            lat={mapSheet.lat}
            lng={mapSheet.lng}
            lake={mapSheet.mode === "lake" ? mapSheet.group : undefined}
            presence={
              mapSheet.mode === "presence"
                ? { name: mapSheet.name, speciesSummary: mapSheet.speciesSummary }
                : undefined
            }
            forecastAreaLabel={
              mapSheet.mode === "forecast" ? forecastAreaLabel : null
            }
            forecastAreaLabelLoading={
              mapSheet.mode === "forecast" ? forecastAreaLabelLoading : false
            }
            expanded={sheetExpanded}
            onExpandedChange={setSheetExpanded}
            onClose={closeMapSheet}
            canUseAi={!!user}
          />
        ) : null}
        <div className="map-page__legend" role="group" aria-label={t("map.legend.title")}>
          <p className="map-page__legend-title">{t("map.legend.title")}</p>
          <div className="map-page__legend-item">
            <span className="map-page__legend-icon map-page__legend-icon--stocking" />
            {t("map.legend.stocking")}
          </div>
          <div className="map-page__legend-item">
            <span className="map-page__legend-icon map-page__legend-icon--presence" />
            {t("map.legend.presence")}
          </div>
          <div className="map-page__legend-item">
            <span className="map-page__legend-icon map-page__legend-icon--catch" />
            {t("map.legend.catch")}
          </div>
          <div className="map-page__legend-item">
            <span className="map-page__legend-icon map-page__legend-icon--search" />
            {t("map.legend.search")}
          </div>
        </div>
      </div>

      {/* Catch registration form */}
      {pendingCatch && (
        <CatchForm
          lat={pendingCatch.lat}
          lng={pendingCatch.lng}
          onClose={() => setPendingCatch(null)}
          onSuccess={async (info) => {
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
        />
      )}
    </div>
  );
}
