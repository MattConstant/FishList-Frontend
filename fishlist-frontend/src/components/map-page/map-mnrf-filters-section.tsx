"use client";

import { MapFilterSectionHeading } from "@/components/map-page/map-filter-section-heading";
import { speciesPillClass } from "@/components/map-page/map-page-classes";
import { translateStockingSpecies } from "@/lib/species-i18n";

type Translate = (key: string, vars?: Record<string, string | number>) => string;
type Locale = "en" | "fr";

type Props = {
  t: Translate;
  locale: Locale;
  showStocking: boolean;
  species: string[];
  activeSpecies: Set<string>;
  toggleAllSpecies: () => void;
  toggleSpecies: (sp: string) => void;
  recentYearsWindow: 1 | 2 | 5;
  setRecentYearsWindow: (v: 1 | 2 | 5) => void;
  minTotalFish: 0 | 500 | 1000 | 5000;
  setMinTotalFish: (v: 0 | 500 | 1000 | 5000) => void;
  minSpeciesCount: 1 | 2 | 3;
  setMinSpeciesCount: (v: 1 | 2 | 3) => void;
  selectedDistrict: string;
  setSelectedDistrict: (v: string) => void;
  districts: string[];
};

export function MapMnrfFiltersSection({
  t,
  locale,
  showStocking,
  species,
  activeSpecies,
  toggleAllSpecies,
  toggleSpecies,
  recentYearsWindow,
  setRecentYearsWindow,
  minTotalFish,
  setMinTotalFish,
  minSpeciesCount,
  setMinSpeciesCount,
  selectedDistrict,
  setSelectedDistrict,
  districts,
}: Props) {
  return (
    <section className="map-page__filter-section" aria-label={t("map.mnrf.section")}>
      <MapFilterSectionHeading
        title={t("map.mnrf.section")}
        infoLabel={t("map.mnrf.info")}
        infoText={t("map.mnrf.info")}
        fish="stocking"
      />
      {!showStocking ? (
        <p className="map-page__filter-layer-hint">{t("map.layers.hintEnableStocking")}</p>
      ) : null}

      {showStocking ? (
        <>
          <p className="map-page__filter-label--field mt-2 w-full">{t("map.sections.speciesPills")}</p>
          <div className="map-page__filter-species-row mt-1">
            <button
              type="button"
              onClick={toggleAllSpecies}
              className={speciesPillClass(activeSpecies.size === species.length)}
            >
              {t("map.species.all")}
            </button>
            {species.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => toggleSpecies(sp)}
                className={speciesPillClass(activeSpecies.has(sp))}
                title={translateStockingSpecies(sp, locale) !== sp ? sp : undefined}
              >
                {translateStockingSpecies(sp, locale)}
              </button>
            ))}
          </div>

          <div className="map-page__filter-form-grid mt-2">
            <div className="map-page__filter-field">
              <label className="map-page__filter-label--field" htmlFor="map-recent-years">
                {t("map.form.recent")}
              </label>
              <div className="map-page__field-wrap">
                <select
                  id="map-recent-years"
                  value={recentYearsWindow}
                  onChange={(e) =>
                    setRecentYearsWindow(Number(e.target.value) as 1 | 2 | 5)
                  }
                  className="map-page__field w-full"
                >
                  <option value={1}>Last 1 year</option>
                  <option value={2}>Last 2 years</option>
                  <option value={5}>Last 5 years</option>
                </select>
              </div>
            </div>
            <div className="map-page__filter-field">
              <label className="map-page__filter-label--field" htmlFor="map-min-fish">
                {t("map.form.minFish")}
              </label>
              <div className="map-page__field-wrap">
                <select
                  id="map-min-fish"
                  value={minTotalFish}
                  onChange={(e) =>
                    setMinTotalFish(Number(e.target.value) as 0 | 500 | 1000 | 5000)
                  }
                  className="map-page__field w-full"
                >
                  <option value={0}>Any</option>
                  <option value={500}>500+</option>
                  <option value={1000}>1,000+</option>
                  <option value={5000}>5,000+</option>
                </select>
              </div>
            </div>
            <div className="map-page__filter-field">
              <label className="map-page__filter-label--field" htmlFor="map-min-species">
                {t("map.form.minSpecies")}
              </label>
              <div className="map-page__field-wrap">
                <select
                  id="map-min-species"
                  value={minSpeciesCount}
                  onChange={(e) =>
                    setMinSpeciesCount(Number(e.target.value) as 1 | 2 | 3)
                  }
                  className="map-page__field w-full"
                >
                  <option value={1}>1+</option>
                  <option value={2}>2+</option>
                  <option value={3}>3+</option>
                </select>
              </div>
            </div>
            <div className="map-page__filter-field">
              <label className="map-page__filter-label--field" htmlFor="map-district">
                {t("map.form.district")}
              </label>
              <div className="map-page__field-wrap">
                <select
                  id="map-district"
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="map-page__field w-full"
                >
                  <option value="all">All districts</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
