"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/contexts/locale-context";
import {
  getImageUrl,
  type CatchResponse,
  type FishingType,
  type LocationWithCatches,
} from "@/lib/api";
import { formatLengthFromCm, formatWeightFromKg } from "@/lib/units";

function fishingTypeLabelKey(type: FishingType): string {
  return `catch.fishingType.${type.toLowerCase()}`;
}

const CATCHES_PER_PAGE = 5;

function formatLocationDate(iso: string) {
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

export function CatchCard({ c }: { c: CatchResponse }) {
  const { t } = useLocale();
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
  const firstImageKey = imageCandidates[0];
  const [thumbSrc, setThumbSrc] = useState<string | null>(() =>
    firstImageKey && !isObjectKey(firstImageKey) ? firstImageKey : null,
  );
  const [resolvedUrls, setResolvedUrls] = useState<string[]>(
    imageCandidates.filter((u) => !isObjectKey(u)),
  );
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!firstImageKey) {
      setThumbSrc(null);
      return;
    }
    if (!isObjectKey(firstImageKey)) {
      setThumbSrc(firstImageKey);
      return;
    }
    let cancelled = false;
    getImageUrl(firstImageKey)
      .then((url) => {
        if (!cancelled) setThumbSrc(url);
      })
      .catch(() => {
        if (!cancelled) setThumbSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [firstImageKey]);

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
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm transition hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800">
          {thumbSrc ? (
            <Image
              src={thumbSrc}
              alt=""
              width={112}
              height={112}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-2xl"
              aria-hidden
            >
              🐟
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
            {c.species}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {c.fishDetails && c.fishDetails.length > 0
              ? `${c.fishDetails.length} fish in this post`
              : [
                    c.quantity && c.quantity > 1 ? `×${c.quantity}` : null,
                    formatLengthFromCm(c.lengthCm),
                    formatWeightFromKg(c.weightKg),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No measurements"}
          </p>
          {c.fishingType && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
              <span aria-hidden>🎣</span>
              {t(fishingTypeLabelKey(c.fishingType))}
            </span>
          )}
          {imageCandidates.length > 1 && (
            <p className="mt-1 text-[11px] font-medium text-sky-600 dark:text-sky-400">
              {t("profile.morePhotos", { n: imageCandidates.length - 1 })}
            </p>
          )}
        </div>
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
          {c.fishDetails && c.fishDetails.length > 0 ? (
            <ul className="space-y-3 text-sm">
              {c.fishDetails.map((f, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800/50"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">{f.species}</p>
                  <p className="text-xs text-zinc-500">
                    {[formatLengthFromCm(f.lengthCm), formatWeightFromKg(f.weightKg)]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {f.notes ? (
                    <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-600 dark:text-zinc-400">
                      {f.notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
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
                <dd className="text-zinc-900 dark:text-zinc-100">{formatLengthFromCm(c.lengthCm)}</dd>
              </div>
            )}
            {c.weightKg != null && (
              <div>
                <dt className="text-xs text-zinc-500">Weight</dt>
                <dd className="text-zinc-900 dark:text-zinc-100">{formatWeightFromKg(c.weightKg)}</dd>
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
          )}
          {imageCandidates.length > 0 && !imgError && (
            resolvedUrls.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {resolvedUrls.map((url) => (
                  <Image
                    key={url}
                    src={url}
                    alt={c.species}
                    width={800}
                    height={600}
                    className="max-h-[280px] w-full rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                    unoptimized
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

export function LocationCard({ loc }: { loc: LocationWithCatches }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [catchPage, setCatchPage] = useState(0);
  const totalCatches = loc.catches.length;

  const catchTotalPages =
    totalCatches === 0 ? 0 : Math.ceil(totalCatches / CATCHES_PER_PAGE);

  useEffect(() => {
    const tp =
      loc.catches.length === 0 ? 0 : Math.ceil(loc.catches.length / CATCHES_PER_PAGE);
    if (tp === 0) {
      setCatchPage(0);
      return;
    }
    setCatchPage((p) => Math.min(p, tp - 1));
  }, [loc.catches.length]);

  const catchPageIndex =
    catchTotalPages === 0 ? 0 : Math.min(catchPage, catchTotalPages - 1);

  const catchesOnPage = useMemo(() => {
    const start = catchPageIndex * CATCHES_PER_PAGE;
    return loc.catches.slice(start, start + CATCHES_PER_PAGE);
  }, [loc.catches, catchPageIndex]);

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
            {formatLocationDate(loc.timeStamp)} · {totalCatches}{" "}
            {totalCatches === 1 ? "catch" : "catches"}
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
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {catchesOnPage.map((c) => (
                  <CatchCard key={c.id} c={c} />
                ))}
              </div>
              {catchTotalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setCatchPage((p) => Math.max(0, p - 1))}
                    disabled={catchPageIndex <= 0}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {t("profile.pagePrev")}
                  </button>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {t("profile.pageStatus", {
                      current: catchPageIndex + 1,
                      total: catchTotalPages,
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setCatchPage((p) =>
                        Math.min(catchTotalPages - 1, p + 1),
                      )
                    }
                    disabled={catchPageIndex >= catchTotalPages - 1}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {t("profile.pageNext")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
