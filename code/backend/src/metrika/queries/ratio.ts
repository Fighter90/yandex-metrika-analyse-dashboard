/**
 * Metrika returns `ym:s:bounceRate` and `ym:s:goalNNNconversionRate` as **percentages** (0–100),
 * e.g. a 19.5% bounce comes back as `19.5`. The app stores and displays rates as 0–1 ratios
 * (the frontend `formatPercent` multiplies by 100), so normalise at ingestion. Null → 0.
 */
export function ratio(percent: number | null | undefined): number {
  return (percent ?? 0) / 100;
}
