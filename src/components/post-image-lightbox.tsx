"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { lockPageScroll } from "@/lib/page-scroll-lock";

export type PostImageLightboxLabels = {
  close: string;
  prev: string;
  next: string;
  imageOf: string;
};

type PostImageLightboxProps = {
  urls: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  labels: PostImageLightboxLabels;
};

export function PostImageLightbox({
  urls,
  index,
  alt,
  onClose,
  onIndexChange,
  labels,
}: PostImageLightboxProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const url = urls[index];
  const hasMultiple = urls.length > 1;
  const canPrev = index > 0;
  const canNext = index < urls.length - 1;

  useEffect(() => {
    if (!mounted || !url) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowLeft" && canPrev) {
        onIndexChange(index - 1);
      }
      if (e.key === "ArrowRight" && canNext) {
        onIndexChange(index + 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const unlockScroll = lockPageScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      unlockScroll();
    };
  }, [mounted, url, index, canPrev, canNext, onClose, onIndexChange]);

  if (!mounted || !url) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-black/92"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        {hasMultiple ? (
          <p className="text-sm font-medium tabular-nums text-white/80">
            {labels.imageOf
              .replace("{{current}}", String(index + 1))
              .replace("{{total}}", String(urls.length))}
          </p>
        ) : (
          <span className="text-sm text-white/60">{alt}</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-white/90 transition hover:bg-white/10"
          aria-label={labels.close}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1 sm:px-8">
        {hasMultiple && canPrev ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index - 1);
            }}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70 sm:left-4"
            aria-label={labels.prev}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}

        <div
          className="relative flex h-full max-h-[calc(100dvh-5rem)] w-full max-w-5xl items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Native img — presigned storage URLs are external and vary by environment. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-h-[calc(100dvh-5rem)] w-auto max-w-full object-contain"
            decoding="async"
          />
        </div>

        {hasMultiple && canNext ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(index + 1);
            }}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition hover:bg-black/70 sm:right-4"
            aria-label={labels.next}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-7 w-7">
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
