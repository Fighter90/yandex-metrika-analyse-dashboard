const NUM = new Intl.NumberFormat('ru-RU');

/** Integer with thin-space grouping (ru-RU). */
export function formatInt(n: number): string {
  return NUM.format(Math.round(n));
}

/** Ratio (0..1) → percent string. */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}

/** ISO timestamp/date → YYYY-MM-DD. */
export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}
