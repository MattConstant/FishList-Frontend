export type LandingLabels = Record<string, string>;

export function label(labels: LandingLabels, key: string): string {
  return labels[key] ?? key;
}
