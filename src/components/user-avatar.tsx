"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { getImageUrl } from "@/lib/api";
import { getAccountWithAvatarCache } from "@/lib/account-cache";

const sizeClass = {
  sm: "h-8 w-8 text-base",
  md: "h-10 w-10 text-xl",
  lg: "h-16 w-16 text-3xl sm:h-20 sm:w-20 sm:text-4xl",
} as const;

export function UserAvatar({
  accountId,
  profileImageKey,
  label,
  size = "md",
  className = "",
  /** When true (default), wait until near the viewport before calling the API — avoids a flood of requests when many avatars mount (e.g. feed). */
  loadWhenVisible = true,
}: {
  accountId: number;
  /** When set (e.g. from feed), skips an extra account lookup. */
  profileImageKey?: string | null;
  label: string;
  size?: keyof typeof sizeClass;
  className?: string;
  loadWhenVisible?: boolean;
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(!loadWhenVisible);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!loadWhenVisible) return;
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadWhenVisible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    async function run() {
      let imgKey = profileImageKey;
      if (imgKey == null) {
        const acc = await getAccountWithAvatarCache(accountId);
        imgKey = acc?.profileImageKey ?? null;
      }
      if (!imgKey) {
        if (!cancelled) setSrc(null);
        return;
      }
      try {
        const url = await getImageUrl(imgKey);
        if (!cancelled) setSrc(url);
      } catch {
        if (!cancelled) setSrc(null);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [visible, accountId, profileImageKey]);

  const cls = sizeClass[size];

  return (
    <span
      ref={rootRef}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 ring-2 ring-zinc-200/90 dark:bg-zinc-700 dark:ring-zinc-600/90 ${cls} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={label}
          width={256}
          height={256}
          className="h-full w-full object-cover"
          unoptimized
        />
      ) : (
        <>
          <span className="select-none leading-none" aria-hidden>
            🎣
          </span>
          <span className="sr-only">{label}</span>
        </>
      )}
    </span>
  );
}
