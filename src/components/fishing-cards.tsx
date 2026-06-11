"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { PostImageLightbox } from "@/components/post-image-lightbox";
import { useLocale } from "@/contexts/locale-context";
import { formatAppShortDate } from "@/lib/format-app-locale";
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

function isObjectKey(url: string) {
  return !url.startsWith("http://") && !url.startsWith("https://");
}

function catchMetaLine(c: CatchResponse): string {
  if (c.fishDetails && c.fishDetails.length > 0) {
    return `${c.fishDetails.length} fish in this post`;
  }
  const parts = [
    c.quantity && c.quantity > 1 ? `×${c.quantity}` : null,
    formatLengthFromCm(c.lengthCm),
    formatWeightFromKg(c.weightKg),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "No measurements";
}

function ProfileCatchCard({ c }: { c: CatchResponse }) {
  const { t } = useLocale();
  const [photosOpen, setPhotosOpen] = useState(false);
  const imageCandidates = useMemo(
    () =>
      c.imageUrls && c.imageUrls.length > 0
        ? c.imageUrls.slice(0, 8)
        : c.imageUrl
          ? [c.imageUrl]
          : [],
    [c.imageUrls, c.imageUrl],
  );
  const [resolvedUrls, setResolvedUrls] = useState<string[]>([]);
  const [imgError, setImgError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const hasPhotos = imageCandidates.length > 0;

  useEffect(() => {
    if (!photosOpen || imageCandidates.length === 0) return;

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
  }, [photosOpen, imageCandidates]);

  return (
    <div className="border-b border-zinc-200/90 last:border-b-0 dark:border-zinc-700/80">
      <div className="flex items-start gap-2 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{c.species}</p>
          <p className="mt-0.5 text-xs text-zinc-500">{catchMetaLine(c)}</p>
          {c.fishingType ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">
              <span aria-hidden>🎣</span>
              {t(fishingTypeLabelKey(c.fishingType))}
            </span>
          ) : null}
        </div>
        {hasPhotos ? (
          <button
            type="button"
            onClick={() => setPhotosOpen((open) => !open)}
            aria-expanded={photosOpen}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-50 active:bg-sky-100/80 dark:text-sky-300 dark:hover:bg-sky-950/40"
          >
            {photosOpen
              ? t("profile.hidePhotos")
              : t("profile.viewPhotos", { n: imageCandidates.length })}
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${photosOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}
      </div>

      {photosOpen && hasPhotos ? (
        <div className="pb-3">
          {resolvedUrls.length > 0 && !imgError ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {resolvedUrls.map((url, imageIndex) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setLightboxIndex(imageIndex)}
                  className="h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-lg border border-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-zinc-700"
                  aria-label={t("home.imageLightbox.open")}
                >
                  <Image
                    src={url}
                    alt={c.species}
                    width={160}
                    height={160}
                    className="h-full w-full object-cover"
                    unoptimized
                    onError={() => setImgError(true)}
                  />
                </button>
              ))}
            </div>
          ) : imgError ? (
            <p className="text-xs text-zinc-400">{t("profile.photoLoadError")}</p>
          ) : (
            <p className="text-xs text-zinc-400">{t("profile.loadingPhotos")}</p>
          )}
        </div>
      ) : null}

      {lightboxIndex != null && resolvedUrls.length > 0 ? (
        <PostImageLightbox
          urls={resolvedUrls}
          index={lightboxIndex}
          alt={c.species}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          labels={{
            close: t("home.imageLightbox.close"),
            prev: t("home.imageLightbox.prev"),
            next: t("home.imageLightbox.next"),
            imageOf: t("home.imageLightbox.imageOf"),
          }}
        />
      ) : null}
    </div>
  );
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
  const directThumb = useMemo(() => {
    if (!firstImageKey) return null;
    return isObjectKey(firstImageKey) ? null : firstImageKey;
  }, [firstImageKey]);
  const [objectThumb, setObjectThumb] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<string[]>(
    imageCandidates.filter((u) => !isObjectKey(u)),
  );
  const [imgError, setImgError] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const thumbSrc = directThumb ?? objectThumb;

  useEffect(() => {
    if (!firstImageKey || !isObjectKey(firstImageKey)) {
      queueMicrotask(() => setObjectThumb(null));
      return;
    }
    let cancelled = false;
    getImageUrl(firstImageKey)
      .then((url) => {
        if (!cancelled) setObjectThumb(url);
      })
      .catch(() => {
        if (!cancelled) setObjectThumb(null);
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
          <p className="mt-0.5 text-xs text-zinc-500">{catchMetaLine(c)}</p>
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
                      .join(" · ") || "-"}
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
                {resolvedUrls.map((url, imageIndex) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setLightboxIndex(imageIndex)}
                    className="cursor-zoom-in overflow-hidden rounded-lg border border-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-zinc-700"
                    aria-label={t("home.imageLightbox.open")}
                  >
                    <Image
                      src={url}
                      alt={c.species}
                      width={800}
                      height={600}
                      className="max-h-[280px] w-full object-cover transition hover:opacity-95"
                      unoptimized
                      onError={() => setImgError(true)}
                    />
                  </button>
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
          {lightboxIndex != null && resolvedUrls.length > 0 ? (
            <PostImageLightbox
              urls={resolvedUrls}
              index={lightboxIndex}
              alt={c.species}
              onClose={() => setLightboxIndex(null)}
              onIndexChange={setLightboxIndex}
              labels={{
                close: t("home.imageLightbox.close"),
                prev: t("home.imageLightbox.prev"),
                next: t("home.imageLightbox.next"),
                imageOf: t("home.imageLightbox.imageOf"),
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

export function LocationCard({
  loc,
  variant = "default",
}: {
  loc: LocationWithCatches;
  variant?: "default" | "profile";
}) {
  const { t, locale } = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [catchPage, setCatchPage] = useState(0);
  const totalCatches = loc.catches.length;
  const isProfile = variant === "profile";

  const catchTotalPages =
    totalCatches === 0 ? 0 : Math.ceil(totalCatches / CATCHES_PER_PAGE);

  const catchPageIndex =
    catchTotalPages === 0 ? 0 : Math.min(catchPage, catchTotalPages - 1);

  const catchesOnPage = useMemo(() => {
    const start = catchPageIndex * CATCHES_PER_PAGE;
    return loc.catches.slice(start, start + CATCHES_PER_PAGE);
  }, [loc.catches, catchPageIndex]);

  return (
    <div
      className={
        isProfile
          ? "overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40"
          : "rounded-2xl border border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/50"
      }
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={
          isProfile
            ? "flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
            : "flex w-full items-center gap-3 px-5 py-4 text-left"
        }
      >
        <span
          className={
            isProfile
              ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-base dark:bg-sky-900/40"
              : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-lg dark:bg-sky-900/40"
          }
        >
          📍
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {loc.locationName}
          </p>
          <p className="text-xs text-zinc-500">
            {formatAppShortDate(loc.timeStamp, locale)} · {totalCatches}{" "}
            {totalCatches === 1 ? "catch" : "catches"}
          </p>
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div
          className={
            isProfile
              ? "border-t border-zinc-200 px-3.5 pb-3 pt-1 dark:border-zinc-800"
              : "space-y-2 border-t border-zinc-200 px-5 pb-5 pt-4 dark:border-zinc-800"
          }
        >
          {!isProfile ? (
            <p className="text-xs text-zinc-500">
              {loc.latitude}, {loc.longitude}
            </p>
          ) : null}
          {loc.catches.length === 0 ? (
            <p className="py-2 text-sm text-zinc-400">No catches recorded.</p>
          ) : (
            <>
              <div className={isProfile ? "divide-y divide-zinc-100 dark:divide-zinc-800" : "grid gap-3 sm:grid-cols-2"}>
                {catchesOnPage.map((c) =>
                  isProfile ? (
                    <ProfileCatchCard key={c.id} c={c} />
                  ) : (
                    <CatchCard key={c.id} c={c} />
                  ),
                )}
              </div>
              {catchTotalPages > 1 && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setCatchPage((p) => Math.max(0, p - 1))}
                    disabled={catchPageIndex <= 0}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {t("profile.pagePrev")}
                  </button>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
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
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
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
