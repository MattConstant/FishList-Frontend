"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getImageUrl, type CatchResponse, type LocationWithCatches } from "@/lib/api";

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
            loc.catches.map((c) => <CatchCard key={c.id} c={c} />)
          )}
        </div>
      )}
    </div>
  );
}
