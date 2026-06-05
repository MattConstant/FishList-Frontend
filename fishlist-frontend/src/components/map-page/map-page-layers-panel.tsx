"use client";

import { LIO_BATHYMETRY_MIN_ZOOM } from "@/lib/lio-bathymetry";
import type { FavoriteSpot } from "@/lib/map-favorites";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  layersPanelExpanded: boolean;
  setLayersPanelExpanded: (v: boolean | ((p: boolean) => boolean)) => void;
  satelliteImagery: boolean;
  setSatelliteImagery: (v: boolean | ((p: boolean) => boolean)) => void;
  showStocking: boolean;
  setShowStocking: (v: boolean | ((p: boolean) => boolean)) => void;
  showAra: boolean;
  setShowAra: (v: boolean | ((p: boolean) => boolean)) => void;
  showCatches: boolean;
  setShowCatches: (v: boolean | ((p: boolean) => boolean)) => void;
  showCamps: boolean;
  setShowCamps: (v: boolean | ((p: boolean) => boolean)) => void;
  showBathymetry: boolean;
  setShowBathymetry: (v: boolean | ((p: boolean) => boolean)) => void;
  showMapLegend: boolean;
  setShowMapLegend: (v: boolean | ((p: boolean) => boolean)) => void;
  favoriteSpots: FavoriteSpot[];
  onRemoveFavorite: (id: string) => void;
  hydrated: boolean;
  userPresent: boolean;
};

export function MapPageLayersPanel({
  t,
  layersPanelExpanded,
  setLayersPanelExpanded,
  satelliteImagery,
  setSatelliteImagery,
  showStocking,
  setShowStocking,
  showAra,
  setShowAra,
  showCatches,
  setShowCatches,
  showCamps,
  setShowCamps,
  showBathymetry,
  setShowBathymetry,
  showMapLegend,
  setShowMapLegend,
  favoriteSpots,
  onRemoveFavorite,
  hydrated,
  userPresent,
}: Props) {
  return (
    <div className="map-page__layers-panel" role="region" aria-label={t("map.layers.title")}>
      <div className="map-page__layers-panel-head">
        <span className="map-page__layers-panel-title">{t("map.layers.title")}</span>
        <button
          type="button"
          className="map-page__layers-chevron"
          aria-expanded={layersPanelExpanded}
          aria-controls="map-layers-panel-body"
          onClick={() => setLayersPanelExpanded((v) => !v)}
          title={
            layersPanelExpanded ? t("map.layers.collapse") : t("map.layers.expand")
          }
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-5 w-5 transition-transform ${layersPanelExpanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {layersPanelExpanded ? (
        <div className="map-page__layers-panel-body" id="map-layers-panel-body">
          <label className="map-page__layers-row" htmlFor="map-layer-satellite">
            <input
              id="map-layer-satellite"
              type="checkbox"
              className="map-page__layers-check"
              checked={satelliteImagery}
              onChange={(e) => setSatelliteImagery(e.target.checked)}
              title={t("map.basemap.satelliteBlurb")}
            />
            <span className="map-page__layers-text">
              <span className="map-page__layers-name">{t("map.layers.satellite")}</span>
              <span className="map-page__layers-blurb">{t("map.basemap.satelliteBlurb")}</span>
            </span>
          </label>
          <label className="map-page__layers-row" htmlFor="map-layer-stocking">
            <input
              id="map-layer-stocking"
              type="checkbox"
              className="map-page__layers-check"
              checked={showStocking}
              onChange={(e) => setShowStocking(e.target.checked)}
            />
            <span className="map-page__layers-text">
              <span className="map-page__layers-name">{t("map.layers.stocking")}</span>
              <span className="map-page__layers-blurb">{t("map.layers.stockingBlurb")}</span>
            </span>
          </label>
          <label className="map-page__layers-row" htmlFor="map-layer-presence">
            <input
              id="map-layer-presence"
              type="checkbox"
              className="map-page__layers-check"
              checked={showAra}
              onChange={(e) => setShowAra(e.target.checked)}
            />
            <span className="map-page__layers-text">
              <span className="map-page__layers-name">{t("map.layers.presence")}</span>
              <span className="map-page__layers-blurb">{t("map.layers.presenceBlurb")}</span>
            </span>
          </label>
          <label className="map-page__layers-row" htmlFor="map-layer-catches">
            <input
              id="map-layer-catches"
              type="checkbox"
              className="map-page__layers-check"
              checked={showCatches}
              onChange={(e) => setShowCatches(e.target.checked)}
              disabled={hydrated ? !userPresent : undefined}
            />
            <span className="map-page__layers-text">
              <span className="map-page__layers-name">{t("map.layers.catches")}</span>
              <span className="map-page__layers-blurb">
                {hydrated && !userPresent
                  ? t("map.layers.catchesLogin")
                  : t("map.layers.catchesBlurb")}
              </span>
            </span>
          </label>
          <label className="map-page__layers-row" htmlFor="map-layer-camps">
            <input
              id="map-layer-camps"
              type="checkbox"
              className="map-page__layers-check"
              checked={showCamps}
              onChange={(e) => setShowCamps(e.target.checked)}
              disabled={hydrated ? !userPresent : undefined}
            />
            <span className="map-page__layers-text">
              <span className="map-page__layers-name">Camps</span>
              <span className="map-page__layers-blurb">
                {hydrated && !userPresent
                  ? "Log in to save camp spots"
                  : "Camping pins (public/friends/private)"}
              </span>
            </span>
          </label>
          <div>
            <label className="map-page__layers-row" htmlFor="map-layer-bathy">
              <input
                id="map-layer-bathy"
                type="checkbox"
                className="map-page__layers-check"
                checked={showBathymetry}
                onChange={(e) => setShowBathymetry(e.target.checked)}
              />
              <span className="map-page__layers-text">
                <span className="map-page__layers-name">{t("map.layers.bathymetry")}</span>
                <span className="map-page__layers-blurb">{t("map.layers.bathymetryBlurb")}</span>
              </span>
            </label>
            {showBathymetry ? (
              <p className="map-page__layers-note">
                {t("map.layers.bathymetryZoomNote", { zoom: LIO_BATHYMETRY_MIN_ZOOM })}
              </p>
            ) : null}
          </div>
          <label className="map-page__layers-row" htmlFor="map-layer-legend">
            <input
              id="map-layer-legend"
              type="checkbox"
              className="map-page__layers-check"
              checked={showMapLegend}
              onChange={(e) => setShowMapLegend(e.target.checked)}
            />
            <span className="map-page__layers-text">
              <span className="map-page__layers-name">{t("map.layers.legend")}</span>
              <span className="map-page__layers-blurb">{t("map.layers.legendBlurb")}</span>
            </span>
          </label>
          {favoriteSpots.length > 0 ? (
            <div className="map-page__favorites-list">
              <p className="map-page__favorites-list-title">{t("map.favorites.listHeading")}</p>
              <ul className="map-page__favorites-list-ul" role="list">
                {favoriteSpots.map((f) => (
                  <li key={f.id} className="map-page__favorites-list-item">
                    <span className="map-page__favorites-list-label" title={f.label}>
                      {f.label}
                    </span>
                    <button
                      type="button"
                      className="map-page__favorites-list-remove"
                      onClick={() => onRemoveFavorite(f.id)}
                      aria-label={t("map.favorites.removeFromList", { name: f.label })}
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="h-4 w-4"
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
