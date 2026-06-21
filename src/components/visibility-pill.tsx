import type { PostVisibility } from "@/lib/api";

/** Small colored badge showing a post/thread's visibility (owner/admin only). */
export function VisibilityPill({
  visibility,
}: {
  visibility: PostVisibility | null | undefined;
}) {
  const v = visibility ?? "PUBLIC";
  const label = v === "FRIENDS" ? "Friends" : v === "PRIVATE" ? "Private" : "Public";
  const cls =
    v === "FRIENDS"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
      : v === "PRIVATE"
        ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  );
}
