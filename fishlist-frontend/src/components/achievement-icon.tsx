"use client";

import type { AchievementCategory, AchievementCode } from "@/lib/api";

/**
 * Per-code SVG glyph for an achievement badge. Falls back to the category glyph if a code
 * isn't matched, then to a generic medal icon. All icons use {@code currentColor} so the
 * surrounding badge controls hue.
 */
export function AchievementIcon({
  code,
  category,
  className,
}: {
  code: AchievementCode;
  category: AchievementCategory;
  className?: string;
}) {
  const path = ICONS[code] ?? CATEGORY_ICONS[category] ?? FALLBACK_PATH;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FISH_PATH =
  "M3 12c2-3 5.5-4 8.5-4 3.5 0 5.5 1.4 7 3 .6.6.6 1.4 0 2-1.5 1.6-3.5 3-7 3-3 0-6.5-1-8.5-4Zm15 0 3-2v4l-3-2Zm-5-1.5h.01";

const TROPHY_PATH =
  "M8 4h8v3a4 4 0 1 1-8 0V4Zm0 3H5a2 2 0 0 0 2 2v0m9-2h3a2 2 0 0 1-2 2v0M9 18h6m-3-7v3m-2 7h4l-1-3h-2l-1 3Z";

const STAR_PATH =
  "m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.3l6.1-.7L12 3Z";

const COMPASS_PATH =
  "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4 2 5-5 2 3-7Z";

const CAMERA_PATH =
  "M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z";

const HEART_PATH =
  "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z";

const CHAT_PATH =
  "M4 6h16v9H8l-4 4V6Zm4 4h8m-8 3h5";

const USERS_PATH =
  "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 19c0-2.8 2.7-4 6-4s6 1.2 6 4M15 15c2.8 0 6 1.2 6 4";

const MEDAL_PATH =
  "M8 4h8l-2 5h-4L8 4Zm4 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 3v3l2 1.5";

const ROD_PATH =
  "M4 20 18 6m-2 0 4 4M14 8l4 4M5 19l4-4m0 0 2 2";

const SNOWFLAKE_PATH =
  "M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13M9 5l3-2 3 2M9 19l3 2 3-2M5 9l-2 3 2 3M19 9l2 3-2 3";

const WAVE_PATH =
  "M3 12c2 2 4 2 6 0s4-2 6 0 4 2 6 0M3 17c2 2 4 2 6 0s4-2 6 0 4 2 6 0";

const RIVER_PATH =
  "M4 5c2 1 4 4 6 4s4-3 6-3 4 2 4 2v3c-2 1-4 4-6 4s-4-3-6-3-4 2-4 2V5Z";

const FLAG_PATH =
  "M5 3v18M5 4h11l-2 4 2 4H5";

const PIN_PATH =
  "M12 21s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13Zm0-10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z";

const ICONS: Partial<Record<AchievementCode, string>> = {
  FIRST_CATCH: FISH_PATH,
  TEN_CATCHES: FISH_PATH,
  FIFTY_CATCHES: STAR_PATH,
  HUNDRED_CATCHES: TROPHY_PATH,
  FIVE_SPECIES: STAR_PATH,
  TEN_SPECIES: STAR_PATH,
  THREE_LOCATIONS: COMPASS_PATH,
  TEN_LOCATIONS: COMPASS_PATH,
  FIRST_PHOTO: CAMERA_PATH,
  FIRST_LIKE_GIVEN: HEART_PATH,
  FIRST_COMMENT: CHAT_PATH,
  FIRST_FRIEND: USERS_PATH,
  POPULAR_CATCH: HEART_PATH,
  TROPHY_FISH: TROPHY_PATH,
  FIRST_FLY: ROD_PATH,
  FLY_FISHING_PRO: ROD_PATH,
  FIRST_TROLLING: WAVE_PATH,
  TROLLING_PRO: WAVE_PATH,
  FIRST_ICE: SNOWFLAKE_PATH,
  ICE_FISHING_PRO: SNOWFLAKE_PATH,
  VERSATILE_ANGLER: STAR_PATH,
  TECHNIQUE_MASTER: TROPHY_PATH,
  STOCKED_LAKE_CATCH: FISH_PATH,
  RIVER_CATCH: RIVER_PATH,
  OCEAN_CATCH: WAVE_PATH,
  TRAILBLAZER: FLAG_PATH,
  RANGE_ROAMER: PIN_PATH,
};

const CATEGORY_ICONS: Record<AchievementCategory, string> = {
  CATCH: FISH_PATH,
  EXPLORATION: COMPASS_PATH,
  SOCIAL: USERS_PATH,
};

const FALLBACK_PATH = MEDAL_PATH;
