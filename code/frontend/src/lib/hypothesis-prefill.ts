/**
 * Seed for prefilling a hypothesis from a weak spot / under-performing item. Every field is
 * optional — deep-links from Overview/Traffic carry whatever context is available (segment +
 * evidence at minimum).
 */
export interface HypothesisSeed {
  /** ЦА / сегмент канала (e.g. «Подкаст»). */
  readonly segment?: string;
  /** Проблема / симптом (e.g. «низкая конверсия»). */
  readonly trouble?: string;
  /** Действие пользователя, на котором возникает проблема. */
  readonly action?: string;
  /** Барьер, мешающий действию. */
  readonly barrier?: string;
  /** Обоснование данными (e.g. «CR 0.7% при 1300 визитах»). */
  readonly evidence?: string;
}

const SEED_KEYS = ['segment', 'trouble', 'action', 'barrier', 'evidence'] as const;

/**
 * Build a deep-link to the Hypotheses page prefilled with seed context. Empty/undefined fields are
 * omitted; values are URL-encoded. Pure and deterministic.
 */
export function buildHypothesisUrl(seed: HypothesisSeed): string {
  const params = new URLSearchParams();
  for (const key of SEED_KEYS) {
    const value = seed[key];
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const qs = params.toString();
  return qs === '' ? '/hypotheses' : `/hypotheses?${qs}`;
}

/**
 * Parse a hypothesis seed from a query string or URLSearchParams. Inverse of
 * {@link buildHypothesisUrl} for the non-empty fields. Missing keys are left undefined.
 */
export function parseHypothesisSeed(search: string | URLSearchParams): HypothesisSeed {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const seed: { -readonly [K in keyof HypothesisSeed]: HypothesisSeed[K] } = {};
  for (const key of SEED_KEYS) {
    const value = params.get(key);
    if (value !== null && value !== '') seed[key] = value;
  }
  return seed;
}

/** True when a seed carries at least one non-empty field — used to decide whether to show context. */
export function hasSeed(seed: HypothesisSeed): boolean {
  return SEED_KEYS.some((key) => seed[key] !== undefined && seed[key] !== '');
}
