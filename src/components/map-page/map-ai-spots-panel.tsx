"use client";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  active: boolean;
  hasBounds: boolean;
  drawArmed: boolean;
  onArmDraw: () => void;
  loading: boolean;
  error: string;
  narrative: string;
  spotCount: number;
  onAsk: () => void;
  onClear: () => void;
  onCancel: () => void;
};

export function MapAiSpotsPanel({
  t,
  active,
  hasBounds,
  drawArmed,
  onArmDraw,
  loading,
  error,
  narrative,
  spotCount,
  onAsk,
  onClear,
  onCancel,
}: Props) {
  if (!active && spotCount === 0 && !narrative && !error) return null;

  return (
    <div className="map-page__ai-spots-panel" role="region" aria-label={t("map.aiSpots.title")}>
      <div className="map-page__ai-spots-panel-head">
        <span className="map-page__ai-spots-panel-title">{t("map.aiSpots.title")}</span>
        {active ? (
          <button type="button" className="map-page__ai-spots-panel-close" onClick={onCancel}>
            {t("map.aiSpots.done")}
          </button>
        ) : (
          <button type="button" className="map-page__ai-spots-panel-close" onClick={onClear}>
            {t("map.aiSpots.clear")}
          </button>
        )}
      </div>
      {active ? (
        <p className="map-page__ai-spots-panel-hint">
          {hasBounds ? t("map.aiSpots.hintAdjust") : t("map.aiSpots.hintDraw")}
        </p>
      ) : null}
      {active ? (
        <div className="map-page__ai-spots-actions">
          <button
            type="button"
            className={[
              "map-page__ai-spots-draw",
              drawArmed ? "map-page__ai-spots-draw--armed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={onArmDraw}
            aria-pressed={drawArmed}
          >
            {drawArmed ? t("map.aiSpots.drawArmed") : t("map.aiSpots.draw")}
          </button>
          {hasBounds ? (
            <button
              type="button"
              className="map-page__ai-spots-ask"
              onClick={onAsk}
              disabled={loading}
            >
              {loading ? t("map.aiSpots.loading") : t("map.aiSpots.ask")}
            </button>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="map-page__ai-spots-error">{error}</p> : null}
      {spotCount > 0 ? (
        <p className="map-page__ai-spots-count">
          {t("map.aiSpots.spotCount", { count: spotCount })}
        </p>
      ) : null}
      {narrative ? (
        <div className="map-page__ai-spots-narrative">{narrative}</div>
      ) : null}
    </div>
  );
}
