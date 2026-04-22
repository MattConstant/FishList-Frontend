"use client";

import type { ReactNode } from "react";

type Props = {
  /** Visible text (e.g. “Searching…”). */
  label?: ReactNode;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Inline loading indicator: simple fish icon with a swimming wiggle animation.
 */
export function FishLoadingSpinner({ label, size = "md", className = "" }: Props) {
  const box = size === "sm" ? "h-5 w-5" : "h-7 w-7";

  return (
    <div
      className={`inline-flex items-center gap-2.5 text-sky-700 dark:text-sky-400 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className={`fish-loading-spinner__icon inline-flex shrink-0 ${box}`} aria-hidden>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M12 4C7 4 2 8 1 12c1 4 6 8 11 8 2-1.5 3.5-3 4.5-4.5L21 18l-1-6 1-6-4.5 2.5C15.5 7 14 5.5 12 4z"
          />
          <circle cx="7" cy="11.5" r="1.2" fill="white" />
        </svg>
      </span>
      {label != null ? (
        <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      ) : null}
    </div>
  );
}
