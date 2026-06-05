"use client";

import type { ConditionStars } from "@/lib/fishing-forecast-rating";

const STAR_PATH =
  "M12 2.5 14.8 9.2 22 10l-5.5 5.4 1.3 7.6L12 18.9l-6.8 3.6 1.3-7.6L1 10l7.2-.8L12 2.5z";

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-7 w-7 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        d={STAR_PATH}
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.35}
        strokeLinejoin="round"
        className={filled ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}
      />
    </svg>
  );
}

type Props = {
  value: ConditionStars;
  /** Screen reader label, e.g. "3 out of 5, fair conditions" */
  ariaLabel: string;
};

export function FishingConditionStars({ value, ariaLabel }: Props) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={ariaLabel}
    >
      {([1, 2, 3, 4, 5] as const).map((i) => (
        <Star key={i} filled={i <= value} />
      ))}
    </div>
  );
}
