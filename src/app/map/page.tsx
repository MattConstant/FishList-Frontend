"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  fetchAraInBounds,
  type AraMapPoint,
  type AraViewport,
} from "@/lib/ara-fish";

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
  const { t } = useLocale();
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
  const [araBass, setAraBass] = useState(true);
  const [araPike, setAraPike] = useState(true);
  const [araWalleye, setAraWalleye] = useState(true);
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
      if (!araBass && !araPike && !araWalleye) {
        setAraPoints([]);
        setAraTooWide(false);
        setAraLoading(false);
        return;
      }
      const gen = ++araFetchGen.current;
      setAraLoading(true);
      setAraTooWide(false);
      fetchAraInBounds(
        v,
        { bass: araBass, pike: araPike, walleye: araWalleye },
      )
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
    [showAra, araBass, araPike, araWalleye],
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
  }, [showAra, araBass, araPike, araWalleye, loadAra]);

  const filterSummaryLine = useMemo(() => {
    if (species.length === 0) return "";
    const spLabel =
      activeSpecies.size === species.length
        ? "All species"
        : `${activeSpecies.size} species`;
    const q = waterbodyQuery.trim();
    const tail = q ? ` · “${q}”` : "";
    const stock =
      showStocking && activeSpecies.size > 0
        ? `${filteredGroups.length} lakes match`
        : !showStocking
          ? "Stocking off"
          : "No species selected";
    const ara = showAra ? " · ARA on" : "";
    return `${stock} · ${spLabel}${ara}${tail}`;
  }, [
    species.length,
    filteredGroups.length,
    activeSpecies.size,
    waterbodyQuery,
    showStocking,
    showAra,
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
                <h3 className="map-page__filter-section-title">
                  {t("map.mnrf.section")}
                </h3>
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
                        All
                      </button>
                      {species.map((sp) => (
                        <button
                          key={sp}
                          type="button"
                          onClick={() => toggleSpecies(sp)}
                          className={speciesPillClass(activeSpecies.has(sp))}
                        >
                          {sp}
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
                      <div className="map-page__filter-field">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-min-fish"
                        >
                          {t("map.form.minFish")}
                        </label>
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
                      <div className="map-page__filter-field">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-min-species"
                        >
                          {t("map.form.minSpecies")}
                        </label>
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
                      <div className="map-page__filter-field">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-district"
                        >
                          {t("map.form.district")}
                        </label>
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
                      <div className="map-page__filter-field sm:col-span-2">
                        <label
                          className="map-page__filter-label--field"
                          htmlFor="map-stage"
                        >
                          {t("map.form.stage")}
                        </label>
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
                  </>
                ) : null}
              </section>

              <section
                className="map-page__filter-section"
                aria-label={t("map.ara.section")}
              >
                <h3 className="map-page__filter-section-title">
                  {t("map.ara.section")}
                </h3>
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
                        className={speciesPillClass(araBass)}
                        aria-pressed={araBass}
                        title={t("map.ara.bassBlurb")}
                        onClick={() => setAraBass((v) => !v)}
                      >
                        {t("map.ara.bassName")}
                      </button>
                      <button
                        type="button"
                        className={speciesPillClass(araPike)}
                        aria-pressed={araPike}
                        title={t("map.ara.pikeBlurb")}
                        onClick={() => setAraPike((v) => !v)}
                      >
                        {t("map.ara.pikeName")}
                      </button>
                      <button
                        type="button"
                        className={speciesPillClass(araWalleye)}
                        aria-pressed={araWalleye}
                        title={t("map.ara.walleyeBlurb")}
                        onClick={() => setAraWalleye((v) => !v)}
                      >
                        {t("map.ara.walleyeName")}
                      </button>
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
          onViewportChange={loadAra}
          satelliteImagery={satelliteImagery}
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
                : `fc-${mapSheet.lat.toFixed(5)}-${mapSheet.lng.toFixed(5)}`
            }
            mode={mapSheet.mode}
            lat={mapSheet.lat}
            lng={mapSheet.lng}
            lake={mapSheet.mode === "lake" ? mapSheet.group : undefined}
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
