"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { sortGeocodeHitsForPinDrop } from "@/lib/geocode-search-sort";
import {
  formatGeocodeHitLabel,
  type GeocodeSearchHit,
} from "@/lib/geocode-search-types";
import type { LakeSearchPinState } from "@/components/map-page/map-page-types";

type MapTranslate = (key: string, vars?: Record<string, string | number>) => string;

export function useMapPlaceSearch(
  locale: "en" | "fr",
  t: MapTranslate,
) {
  const [lakePinQuery, setLakePinQuery] = useState("");
  const [lakePinError, setLakePinError] = useState("");
  const [lakePinSearching, setLakePinSearching] = useState(false);
  const [lakeSearchPin, setLakeSearchPin] = useState<LakeSearchPinState | null>(
    null,
  );
  const [lakeSuggestions, setLakeSuggestions] = useState<GeocodeSearchHit[]>([]);
  const [lakeSuggestionsOpen, setLakeSuggestionsOpen] = useState(false);
  const [lakeSuggestionIndex, setLakeSuggestionIndex] = useState(-1);
  const lakeSearchAbortRef = useRef<AbortController | null>(null);

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
        const data = (await res.json()) as { results?: GeocodeSearchHit[] };
        const hits = data.results ?? [];
        const sorted = sortGeocodeHitsForPinDrop(hits, q);
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

  const selectLakeSuggestion = useCallback((s: GeocodeSearchHit) => {
    const label = formatGeocodeHitLabel(s);
    setLakeSearchPin({
      lat: s.latitude,
      lng: s.longitude,
      label,
    });
    setLakePinQuery(label);
    setLakeSuggestionsOpen(false);
    setLakePinError("");
  }, []);

  const handleLakePinSearch = useCallback(
    (e: FormEvent) => {
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
    },
    [
      lakeSuggestionIndex,
      lakeSuggestions,
      lakePinQuery,
      selectLakeSuggestion,
      t,
    ],
  );

  const handleLakeSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    },
    [lakeSuggestionsOpen, lakeSuggestions],
  );

  const clearPlaceSearch = useCallback(() => {
    setLakeSearchPin(null);
    setLakePinQuery("");
    setLakePinError("");
    setLakeSuggestionsOpen(false);
    setLakeSuggestionIndex(-1);
  }, []);

  return {
    lakePinQuery,
    setLakePinQuery,
    lakePinError,
    setLakePinError,
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
  };
}
