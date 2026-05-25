export type HomePreviewSlide = {
  imageSrc: string;
  username: string;
  species: string;
  location: string;
  dateLabel: string;
  likes: number;
  comments: number;
};

/** Rows: image, username, species, location, date, likes, comments */
const PREVIEW_SLIDE_ROWS: [string, string, string, string, string, number, number][] = [
  ["/example1.webp", "brookie_mike", "Brook trout", "Nipigon River", "Apr 2026", 28, 6],
  ["/example2.webp", "shore_lunch", "Walleye", "Lake of the Woods", "Apr 2026", 41, 9],
  ["/example3.webp", "early_spring", "Steelhead", "Ottawa River", "Mar 2026", 19, 4],
  ["/example4.jpg", "quiet_creek", "Smallmouth bass", "Georgian Bay", "Apr 2026", 33, 7],
  ["/example5.jpg", "sunrise_cast", "Northern pike", "French River", "Apr 2026", 52, 11],
  ["/example6.avif", "maple_angler", "Lake trout", "Algonquin Highlands", "Apr 2026", 24, 5],
];

export const HOME_PREVIEW_SLIDES: HomePreviewSlide[] = PREVIEW_SLIDE_ROWS.map(
  ([imageSrc, username, species, location, dateLabel, likes, comments]) => ({
    imageSrc,
    username,
    species,
    location,
    dateLabel,
    likes,
    comments,
  }),
);
