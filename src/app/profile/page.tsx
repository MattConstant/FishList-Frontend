"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocale } from "@/contexts/locale-context";
import {
  fetchUserLocations,
  getDisplayErrorMessage,
  getImageUrl,
  type LocationWithCatches,
  type CatchResponse,
} from "@/lib/api";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function isObjectKey(url: string) {
  return !url.startsWith("http://") && !url.startsWith("https://");
}

function CatchCard({ c }: { c: CatchResponse }) {
  const [open, setOpen] = useState(false);
  const imageCandidates = useMemo(
    () =>
      c.imageUrls && c.imageUrls.length > 0
        ? c.imageUrls.slice(0, 4)
        : c.imageUrl
          ? [c.imageUrl]
          : [],
    [c.imageUrls, c.imageUrl],
  );
  const [resolvedUrls, setResolvedUrls] = useState<string[]>(
    imageCandidates.filter((u) => !isObjectKey(u)),
  );
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!open || imageCandidates.length === 0) return;

    let cancelled = false;
    Promise.all(
      imageCandidates.map(async (value) => {
        if (!isObjectKey(value)) return value;
        return getImageUrl(value);
      }),
    )
      .then((urls) => {
        if (!cancelled) setResolvedUrls(urls.filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setImgError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, imageCandidates]);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-2xl">🐟</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
            {c.species}
          </p>
          <p className="text-xs text-zinc-500">
            {[
              c.quantity && c.quantity > 1 ? `×${c.quantity}` : null,
              c.lengthCm ? `${c.lengthCm} cm` : null,
              c.weightKg ? `${c.weightKg} kg` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No measurements"}
          </p>
        </div>
        {imageCandidates.length > 0 && (
          <span className="text-xs text-sky-500">📷</span>
        )}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-800">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {c.quantity != null && (
              <div>
                <dt className="text-xs text-zinc-500">Quantity</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{c.quantity}</dd>
              </div>
            )}
            {c.lengthCm != null && (
              <div>
                <dt className="text-xs text-zinc-500">Length</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{c.lengthCm} cm</dd>
              </div>
            )}
            {c.weightKg != null && (
              <div>
                <dt className="text-xs text-zinc-500">Weight</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{c.weightKg} kg</dd>
              </div>
            )}
            {c.notes && (
              <div className="col-span-2">
                <dt className="text-xs text-zinc-500">Notes</dt>
                <dd className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {c.notes}
                </dd>
              </div>
            )}
            {c.description && (
              <div className="col-span-2">
                <dt className="text-xs text-zinc-500">Description</dt>
                <dd className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-100">
                  {c.description}
                </dd>
              </div>
            )}
          </dl>
          {imageCandidates.length > 0 && !imgError && (
            resolvedUrls.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {resolvedUrls.map((url) => (
                  <img
                    key={url}
                    src={url}
                    alt={c.species}
                    className="w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                    style={{ maxHeight: 280 }}
                    onError={() => setImgError(true)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-3 flex h-32 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
                <p className="text-xs text-zinc-400">Loading image…</p>
              </div>
            )
          )}
          {imgError && (
            <p className="mt-3 text-xs text-zinc-400">Could not load image.</p>
          )}
        </div>
      )}
    </div>
  );
}

function LocationCard({ loc }: { loc: LocationWithCatches }) {
  const [expanded, setExpanded] = useState(false);
  const totalCatches = loc.catches.length;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg dark:bg-sky-900/40">
          📍
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
            {loc.locationName}
          </p>
          <p className="text-xs text-zinc-500">
            {formatDate(loc.timeStamp)} ·{" "}
            {totalCatches} {totalCatches === 1 ? "catch" : "catches"}
          </p>
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-zinc-200 px-5 pb-5 pt-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-500">
            {loc.latitude}, {loc.longitude}
          </p>
          {loc.catches.length === 0 ? (
            <p className="py-2 text-sm text-zinc-400">No catches recorded.</p>
          ) : (
            loc.catches.map((c) => <CatchCard key={c.id} c={c} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, isReady, refreshUser } = useAuth();
  const { t } = useLocale();
  const [refreshError, setRefreshError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [locations, setLocations] = useState<LocationWithCatches[]>([]);
  const [catchesLoading, setCatchesLoading] = useState(false);
  const [catchesError, setCatchesError] = useState("");

  const loadCatches = useCallback(async () => {
    if (!user) return;
    setCatchesLoading(true);
    setCatchesError("");
    try {
      const locs = await fetchUserLocations(user.id);
      setLocations(locs);
    } catch (e) {
      setCatchesError(getDisplayErrorMessage(e, t("profile.failedLoad")));
    } finally {
      setCatchesLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    void loadCatches();
  }, [loadCatches]);

  async function refreshProfile() {
    setRefreshError("");
    setRefreshing(true);
    try {
      await refreshUser();
    } catch (e) {
      setRefreshError(getDisplayErrorMessage(e, t("profile.failedRefresh")));
    } finally {
      setRefreshing(false);
    }
  }

  if (!isReady) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <p className="text-center text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {t("profile.title")}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-400">
          {t("profile.notSignedIn")}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex w-fit items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          {t("nav.login")}
        </Link>
      </div>
    );
  }

  const totalCatches = locations.reduce((sum, l) => sum + l.catches.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {t("profile.title")}
      </h1>

      {/* Account info */}
      <dl className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("profile.username")}
          </dt>
          <dd className="mt-1 text-lg text-zinc-900 dark:text-zinc-50">
            {user.username}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("profile.locations")}
          </dt>
          <dd className="mt-1 text-lg text-zinc-900 dark:text-zinc-50">
            {locations.length}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("profile.totalCatches")}
          </dt>
          <dd className="mt-1 text-lg text-zinc-900 dark:text-zinc-50">
            {totalCatches}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void refreshProfile()}
          disabled={refreshing}
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {refreshing ? t("profile.refreshing") : t("profile.refresh")}
        </button>
        <button
          type="button"
          onClick={() => void loadCatches()}
          disabled={catchesLoading}
          className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {catchesLoading ? t("profile.loading") : t("profile.reloadCatches")}
        </button>
      </div>
      {refreshError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {refreshError}
        </p>
      )}

      {/* Catches section */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {t("profile.myCatches")}
        </h2>

        {catchesLoading && locations.length === 0 && (
          <div className="mt-6 flex items-center justify-center py-12">
            <svg
              className="h-6 w-6 animate-spin text-sky-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
          </div>
        )}

        {catchesError && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {catchesError}
          </p>
        )}

        {!catchesLoading && !catchesError && locations.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500">
            {t("profile.noCatches")}
          </p>
        )}

        {locations.length > 0 && (
          <div className="mt-4 space-y-3">
            {locations.map((loc) => (
              <LocationCard key={loc.id} loc={loc} />
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => logout()}
        className="mt-10 w-full rounded-xl border border-zinc-300 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        {t("profile.logout")}
      </button>
    </div>
  );
}
