"use client";

type FishMarker = "stocking" | "presence";

type Props = {
  title: string;
  infoLabel: string;
  infoText: string;
  fish: FishMarker;
};

export function MapFilterSectionHeading({ title, infoLabel, infoText, fish }: Props) {
  return (
    <div className="map-page__filter-section-head">
      <div className="map-page__filter-section-title-wrap">
        <span
          className={`map-page__legend-icon map-page__filter-fish-icon map-page__legend-icon--${fish}`}
          aria-hidden
        />
        <h3 className="map-page__filter-section-title">{title}</h3>
      </div>
      <span className="map-page__filter-info">
        <button type="button" className="map-page__filter-info-icon" aria-label={infoLabel}>
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM9.25 9a.75.75 0 01.75-.75h.01a.75.75 0 01.74.84l-.46 4.13a.75.75 0 11-1.49-.16l.45-4.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <span className="map-page__filter-info-tooltip" role="tooltip">
          {infoText}
        </span>
      </span>
    </div>
  );
}
