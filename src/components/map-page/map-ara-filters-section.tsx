"use client";

import { MapFilterSectionHeading } from "@/components/map-page/map-filter-section-heading";
import { speciesPillClass } from "@/components/map-page/map-page-classes";
import { ARA_SPECIES_FILTERS, type AraSpeciesFilter } from "@/lib/ara-fish";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  showAra: boolean;
  presenceSpecies: Set<AraSpeciesFilter>;
  togglePresenceSpecies: (speciesKey: AraSpeciesFilter) => void;
  toggleAllPresenceSpecies: () => void;
  araLoading: boolean;
  araTooWide: boolean;
};

export function MapAraFiltersSection({
  t,
  showAra,
  presenceSpecies,
  togglePresenceSpecies,
  toggleAllPresenceSpecies,
  araLoading,
  araTooWide,
}: Props) {
  return (
    <section className="map-page__filter-section" aria-label={t("map.ara.section")}>
      <MapFilterSectionHeading
        title={t("map.ara.section")}
        infoLabel={t("map.ara.info")}
        infoText={t("map.ara.info")}
        fish="presence"
      />
      {!showAra ? (
        <p className="map-page__filter-layer-hint">{t("map.layers.hintEnablePresence")}</p>
      ) : null}

      {showAra ? (
        <div className="map-page__filter-substack" aria-live="polite">
          <p className="map-page__filter-label--field w-full pt-1 pl-0.5">
            {t("map.ara.pillHeading")}
          </p>
          <div className="map-page__filter-species-row">
            <button
              type="button"
              className={speciesPillClass(
                presenceSpecies.size === ARA_SPECIES_FILTERS.length,
              )}
              onClick={toggleAllPresenceSpecies}
            >
              {t("map.species.all")}
            </button>
            {ARA_SPECIES_FILTERS.map((speciesKey) => (
              <button
                key={speciesKey}
                type="button"
                className={speciesPillClass(presenceSpecies.has(speciesKey))}
                aria-pressed={presenceSpecies.has(speciesKey)}
                onClick={() => togglePresenceSpecies(speciesKey)}
              >
                {t(`map.ara.species.${speciesKey}`)}
              </button>
            ))}
          </div>
          {araLoading || araTooWide ? (
            <div className="map-page__filter-ara-status">
              {araLoading ? (
                <span className="text-sky-600 dark:text-sky-400/90">{t("map.ara.loading")}</span>
              ) : (
                <span className="text-amber-800/95 dark:text-amber-300/90">
                  {t("map.ara.tooWide")}
                </span>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
