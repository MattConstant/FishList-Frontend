export function segmentBtnClass(on: boolean) {
  return ["map-page__segment-btn", on ? "map-page__segment-btn--active" : ""]
    .filter(Boolean)
    .join(" ");
}

export function speciesPillClass(active: boolean) {
  return ["map-page__species-pill", active ? "map-page__species-pill--active" : ""]
    .filter(Boolean)
    .join(" ");
}
