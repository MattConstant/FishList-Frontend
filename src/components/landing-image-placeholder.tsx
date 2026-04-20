"use client";

/**
 * Placeholder for marketing screenshots that are not ready yet — flat, no gradients.
 */
export function LandingImagePlaceholder({
  label,
  caption,
  className = "",
}: {
  label: string;
  caption: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex aspect-[4/3] w-full max-w-xl flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-100 px-4 py-8 text-center text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="h-12 w-12 shrink-0 opacity-60"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
      <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{caption}</p>
    </div>
  );
}
