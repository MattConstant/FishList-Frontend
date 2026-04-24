/**
 * Placeholder for users without a profile photo — custom mark (not a platform-default emoji).
 */
export function DefaultAvatarIcon({
  className = "text-zinc-500 dark:text-zinc-400",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 22a7 7 0 0 0 7-7c0-5-7-13-7-13S5 10 5 15a7 7 0 0 0 7 7" />
    </svg>
  );
}
