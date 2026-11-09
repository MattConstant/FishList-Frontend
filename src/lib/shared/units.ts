/**
 * Unit conversion helpers.
 *
 * Length and weight are persisted in metric (cm / kg) to keep the backend canonical, but the UI
 * collects and renders them in imperial (in / lbs). These helpers are the single source of truth
 * for the conversion factors and rounding rules so display stays consistent across pages.
 */

const IN_PER_CM = 0.3937007874;
const CM_PER_IN = 2.54;
const LBS_PER_KG = 2.2046226218;
const KG_PER_LBS = 0.45359237;

export function cmToInches(cm: number): number {
  return cm * IN_PER_CM;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_IN;
}

export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LBS;
}

/** Round to one decimal for friendly display (e.g. 12.7 in instead of 12.69947…). */
export function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Format a metric length value as imperial. Returns {@code null} when the input is missing.
 *
 * @example formatLengthFromCm(70) // "27.6 in"
 */
export function formatLengthFromCm(cm: number | null | undefined): string | null {
  if (cm == null || !Number.isFinite(cm)) return null;
  return `${roundToOneDecimal(cmToInches(cm))} in`;
}

/**
 * Format a metric weight value as imperial. Returns {@code null} when the input is missing.
 *
 * @example formatWeightFromKg(5) // "11 lbs"
 */
export function formatWeightFromKg(kg: number | null | undefined): string | null {
  if (kg == null || !Number.isFinite(kg)) return null;
  return `${roundToOneDecimal(kgToLbs(kg))} lbs`;
}
