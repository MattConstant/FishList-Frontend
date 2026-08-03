"use client";

import { segmentBtnClass } from "@/components/map-page/map-page-classes";

type Props = {
  placing: boolean;
  mapSheetExists: boolean;
  userPresent: boolean;
  catchScope: "all" | "friends" | "mine";
  setCatchScope: (v: "all" | "friends" | "mine") => void;
  logMenuOpen: boolean;
  setLogMenuOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  /** Pulse the Log button (e.g. when arriving from "Post a catch" on the home page). */
  highlightLog?: boolean;
  onLogCatch: () => void;
  onLogCamp: () => void;
  onCancelPlacing: () => void;
  onCloseSheet: () => void;
  clearPinLabel: string;
  areaSelectMode?: boolean;
  onToggleAreaSelect?: () => void;
  areaSelectLabel?: string;
};

export function MapPageToolbar({
  placing,
  mapSheetExists,
  userPresent,
  catchScope,
  setCatchScope,
  logMenuOpen,
  setLogMenuOpen,
  highlightLog,
  onLogCatch,
  onLogCamp,
  onCancelPlacing,
  onCloseSheet,
  clearPinLabel,
  areaSelectMode = false,
  onToggleAreaSelect,
  areaSelectLabel = "Find spots",
}: Props) {
  // Logged out with nothing to act on: no toolbar at all. The map page shows a
  // floating "Log in to add catches" pill on the map instead.
  if (!userPresent && !placing && !mapSheetExists && !areaSelectMode) {
    return null;
  }
  return (
    <div className="map-page__toolbar map-page__chrome">
      <div className="map-page__toolbar-actions sm:ml-auto">
        {userPresent && (
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
        {userPresent && onToggleAreaSelect ? (
          <button
            type="button"
            onClick={onToggleAreaSelect}
            disabled={placing}
            className={[
              "map-page__area-select-btn",
              areaSelectMode ? "map-page__area-select-btn--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-pressed={areaSelectMode}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path
                fillRule="evenodd"
                d="M3.5 3.5a1 1 0 011-1H8a1 1 0 010 2H5.5V8a1 1 0 01-2 0V4.5a1 1 0 011-1zm13 0a1 1 0 011 1V8a1 1 0 11-2 0V5.5H12a1 1 0 110-2h3.5a1 1 0 011 1zM4.5 12a1 1 0 011 1v2.5H8a1 1 0 110 2H4.5a1 1 0 01-1-1V13a1 1 0 011-1zm11 0a1 1 0 011 1v3.5a1 1 0 01-1 1H12a1 1 0 110-2h2.5V13a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            {areaSelectLabel}
          </button>
        ) : null}
        {userPresent && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setLogMenuOpen((v) => !v)}
              disabled={placing || areaSelectMode}
              className={[
                "map-page__log-catch",
                placing ? "map-page__log-catch--placing" : "",
                highlightLog && !placing ? "map-page__log-catch--highlight" : "",
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
                  Log
                </>
              )}
            </button>

            {logMenuOpen && !placing && !areaSelectMode ? (
              <div className="absolute right-0 z-[2000] mt-2 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setLogMenuOpen(false);
                    onLogCatch();
                  }}
                >
                  <span aria-hidden>🐟</span> Log a catch
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    setLogMenuOpen(false);
                    onLogCamp();
                  }}
                >
                  <span aria-hidden>🏕️</span> Log a camp
                </button>
              </div>
            ) : null}
          </div>
        )}
        {placing && (
          <button type="button" onClick={onCancelPlacing} className="map-page__cancel-btn">
            Cancel
          </button>
        )}
        {mapSheetExists && !placing && !areaSelectMode && (
          <button type="button" onClick={onCloseSheet} className="map-page__cancel-btn">
            {clearPinLabel}
          </button>
        )}
      </div>
    </div>
  );
}
