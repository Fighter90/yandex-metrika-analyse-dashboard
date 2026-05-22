/**
 * ICE = Impact × Confidence × Ease (product, not mean).
 * See docs/decisions/005-ice-product-vs-mean.md and docs/methodology-ice.md.
 */
export const ICE_CONFIG = {
  formula: 'product', // 'product' | 'arithmetic_mean' (switching requires an ADR)
  scale: { min: 1, max: 10 },
  thresholds: {
    low: 125, // 5 * 5 * 5
    medium: 342, // ~7 * 7 * 7
    high: 729, // 9 * 9 * 9
  },
  requireRationale: true,
} as const;

/** Hidden-assumption categories — hypothesis validation requires ≥3 spanning all three. */
export const ASSUMPTION_CATEGORIES = ['behavior', 'market', 'tech'] as const;

/** Validation method types — hypothesis validation requires ≥2 distinct types per hypothesis. */
export const VALIDATION_METHOD_TYPES = ['synthetic', 'live', 'quantitative', 'market'] as const;

/** Traffic-light outcomes that close the hypothesis loop into a Decision Log entry. */
export const TRAFFIC_LIGHT = ['green', 'yellow', 'red'] as const;

/** Marketing channels for breakdowns (§1 of the spec). */
export const CHANNELS = [
  'podcast',
  'info_partners',
  'ambassadors',
  'referrals',
  'content',
  'direct',
  'search',
] as const;

export const KPI_TARGET_PAID_TICKETS = 300;
