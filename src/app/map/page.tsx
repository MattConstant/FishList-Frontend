"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import CatchForm from "@/components/catch-form";
import type { CatchMapMarker } from "@/components/stocking-map";
import { fetchLatestPosts, fetchMyFriends, getImageUrl } from "@/lib/api";
import {
  allDevelopmentalStages,
  allDistricts,
  allSpecies,
  fetchAllStockingRecords,
  groupByWaterbody,
  type StockingRecord,
  type WaterbodyGroup,
} from "@/lib/geohub";

const StockingMap = dynamic(() => import("@/components/stocking-map"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center text-zinc-500">
      Initializing map…
    </div>
  ),
});

type PendingCatch = { lat: number; lng: number };

export default function MapPage() {
  const { user } = useAuth();
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
  const [pendingCatch, setPendingCatch] = useState<PendingCatch | null>(null);
  const [catchMarkers, setCatchMarkers] = useState<CatchMapMarker[]>([]);
  const [friendIds, setFriendIds] = useState<Set<number>>(new Set());
  const [catchScope, setCatchScope] = useState<"all" | "friends" | "mine">("all");

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

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!placing) return;
      setPlacing(false);
      setPendingCatch({ lat, lng });
    },
    [placing],
  );

  function handleLogCatchClick() {
    if (!user) return;
    setPlacing(true);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Stocked Lakes Map
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {loading
              ? `Loading Ontario fish stocking data… ${loaded.toLocaleString()} records`
              : error
                ? error
                : `${records.length.toLocaleString()} stocking records across ${groups.length.toLocaleString()} waterbodies (last 5 years)`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {user && (
            <div className="inline-flex rounded-xl border border-zinc-300 bg-white p-1 dark:border-zinc-600 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setCatchScope("all")}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  catchScope === "all"
                    ? "bg-sky-600 text-white"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                ].join(" ")}
              >
                Everyone
              </button>
              <button
                type="button"
                onClick={() => setCatchScope("friends")}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  catchScope === "friends"
                    ? "bg-sky-600 text-white"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                ].join(" ")}
              >
                Friends + Me
              </button>
              <button
                type="button"
                onClick={() => setCatchScope("mine")}
                className={[
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  catchScope === "mine"
                    ? "bg-sky-600 text-white"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800",
                ].join(" ")}
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
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
                placing
                  ? "bg-amber-500 text-white"
                  : "bg-sky-600 text-white hover:bg-sky-700",
              ].join(" ")}
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
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Log in to add catches
            </Link>
          )}
          {placing && (
            <button
              type="button"
              onClick={() => setPlacing(false)}
              className="rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Species filter */}
      {species.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
          <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Filter
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium transition",
              activeSpecies.size === species.length
                ? "border-sky-600 bg-sky-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-sky-400 dark:border-zinc-600 dark:text-zinc-300",
            ].join(" ")}
          >
            All
          </button>
          {species.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => toggleSpecies(sp)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-medium transition",
                activeSpecies.has(sp)
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-zinc-300 text-zinc-600 hover:border-sky-400 dark:border-zinc-600 dark:text-zinc-300",
              ].join(" ")}
            >
              {sp}
            </button>
          ))}

          <div className="ml-0 mt-2 w-full border-t border-zinc-200 pt-3 dark:border-zinc-800" />

          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Waterbody
          </label>
          <input
            type="text"
            value={waterbodyQuery}
            onChange={(e) => setWaterbodyQuery(e.target.value)}
            placeholder="Search lake or river name"
            className="min-w-56 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <label className="ml-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Recent
          </label>
          <select
            value={recentYearsWindow}
            onChange={(e) => setRecentYearsWindow(Number(e.target.value) as 1 | 2 | 5)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value={1}>Last 1 year</option>
            <option value={2}>Last 2 years</option>
            <option value={5}>Last 5 years</option>
          </select>

          <label className="ml-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Min fish
          </label>
          <select
            value={minTotalFish}
            onChange={(e) =>
              setMinTotalFish(Number(e.target.value) as 0 | 500 | 1000 | 5000)
            }
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value={0}>Any</option>
            <option value={500}>500+</option>
            <option value={1000}>1,000+</option>
            <option value={5000}>5,000+</option>
          </select>

          <label className="ml-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Species count
          </label>
          <select
            value={minSpeciesCount}
            onChange={(e) => setMinSpeciesCount(Number(e.target.value) as 1 | 2 | 3)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value={1}>1+</option>
            <option value={2}>2+</option>
            <option value={3}>3+</option>
          </select>

          <label className="ml-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            District
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All districts</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <label className="ml-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Stage
          </label>
          <select
            value={selectedDevelopmentalStage}
            onChange={(e) => setSelectedDevelopmentalStage(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All stages</option>
            {developmentalStages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Map */}
      <div
        className="relative min-h-0 flex-1"
        style={placing ? { cursor: "crosshair" } : undefined}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-100/80 dark:bg-zinc-900/80">
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
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {loaded.toLocaleString()} records loaded…
              </p>
            </div>
          </div>
        )}

        {/* Placing-mode banner */}
        {placing && (
          <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-medium text-amber-800 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            Click anywhere on the map to place your catch
          </div>
        )}

        <StockingMap
          groups={filteredGroups}
          activeSpecies={activeSpecies}
          onMapClick={handleMapClick}
          placing={placing}
          catchMarkers={catchMarkers}
          catchScope={catchScope}
          friendIds={friendIds}
          currentUserId={user?.id}
        />
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
              imageUrl: resolvedUrl,
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
