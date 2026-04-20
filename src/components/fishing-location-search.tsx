"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  formatGeocodeHitLabel,
  type GeocodeSearchHit,
} from "@/lib/geocode-search-types";

type Props = {
  locale: "en" | "fr";
  /** Current coordinates used for the forecast. */
  latitude: number;
  longitude: number;
  /** Human label when user picked a place or used “near you”. */
  locationLabel: string | null;
  onLocationChange: (lat: number, lon: number, label: string | null) => void;
  searchPlaceholder: string;
  searchingLabel: string;
  noResultsLabel: string;
  locationSectionLabel: string;
  unsetHint: string;
};

const DEBOUNCE_MS = 380;

export function FishingLocationSearch({
  locale,
  latitude,
  longitude,
  locationLabel,
  onLocationChange,
  searchPlaceholder,
  searchingLabel,
  noResultsLabel,
  locationSectionLabel,
  unsetHint,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeSearchHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setActiveIndex(-1);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);
    const t = window.setTimeout(() => {
      const u = new URL("/api/geocode-search", window.location.origin);
      u.searchParams.set("q", query.trim());
      u.searchParams.set("lang", locale);
      void fetch(u.toString())
        .then((res) => res.json() as Promise<{ results?: GeocodeSearchHit[] }>)
        .then((data) => {
          setResults(data.results ?? []);
          setActiveIndex(-1);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [query, locale]);

  const pick = useCallback(
    (hit: GeocodeSearchHit) => {
      onLocationChange(hit.latitude, hit.longitude, formatGeocodeHitLabel(hit));
      setQuery("");
      setOpen(false);
      setResults([]);
      setActiveIndex(-1);
    },
    [onLocationChange],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const hit = results[activeIndex];
      if (hit) pick(hit);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
      <label className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
        {locationSectionLabel}
        <input
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={searchPlaceholder}
          className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-sky-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
          }
        />
      </label>

      {open && query.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              {searchingLabel}
            </li>
          ) : results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
              {noResultsLabel}
            </li>
          ) : (
            results.map((hit, i) => (
              <li key={hit.id} role="presentation">
                <button
                  type="button"
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={activeIndex === i}
                  className={[
                    "w-full px-3 py-2.5 text-left text-sm transition-colors",
                    activeIndex === i
                      ? "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100"
                      : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800",
                  ].join(" ")}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(hit)}
                >
                  <span className="font-medium">{formatGeocodeHitLabel(hit)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {locationLabel ? (
          <>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              {locationLabel}
            </span>
            <span className="ml-1.5 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </span>
          </>
        ) : (
          unsetHint
        )}
      </p>
    </div>
  );
}
