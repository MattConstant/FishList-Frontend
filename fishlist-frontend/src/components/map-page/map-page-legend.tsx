"use client";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  visible: boolean;
  /** Hide floating legend on small screens while the layers drawer is open (avoids covering it). */
  layersPanelExpanded?: boolean;
};

export function MapPageLegend({ t, visible, layersPanelExpanded = false }: Props) {
  if (!visible) return null;
  return (
    <div
      className={[
        "map-page__legend",
        layersPanelExpanded ? "map-page__legend--layers-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={t("map.legend.title")}
    >
      <p className="map-page__legend-title">{t("map.legend.title")}</p>
      <div className="map-page__legend-item">
        <span className="map-page__legend-icon map-page__legend-icon--stocking" />
        {t("map.legend.stocking")}
      </div>
      <div className="map-page__legend-item">
        <span className="map-page__legend-icon map-page__legend-icon--presence" />
        {t("map.legend.presence")}
      </div>
      <div className="map-page__legend-item">
        <span className="map-page__legend-icon map-page__legend-icon--catch" />
        {t("map.legend.catch")}
      </div>
      <div className="map-page__legend-item">
        <span className="map-page__legend-icon map-page__legend-icon--search" />
        {t("map.legend.search")}
      </div>
      <div className="map-page__legend-item">
        <span className="map-page__legend-icon map-page__legend-icon--favorite" />
        {t("map.legend.favorite")}
      </div>
      <div className="map-page__legend-item">
        <span className="map-page__legend-icon map-page__legend-icon--depth" />
        {t("map.legend.depth")}
      </div>
    </div>
  );
}
