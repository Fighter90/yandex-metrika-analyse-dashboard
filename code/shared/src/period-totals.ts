import type { ChannelStat } from './types/metrics';

/**
 * Headline period totals, derived from `channel_stats` — the canonical traffic source. Every page
 * that shows a headline "Визиты" / "Заявки B2C" number (Overview KPI, Funnel, Goals) MUST read
 * from this single helper so the three surfaces never diverge. Per-breakdown tables (geo, pages,
 * utm) keep their own dimension sums — those are expected to differ from these headline totals.
 */
export interface PeriodTotals {
  readonly visits: number;
  readonly applications: number;
  /** applications / visits, defensively clamped to [0, 1] (see {@link clampRatio}). */
  readonly conversionRate: number;
}

/**
 * Clamp a ratio (e.g. a conversion rate) to the [0, 1] range. Metrika can return
 * conversionRate > 100% on multi-goal pages; clamping here prevents the "Лучший CR: 200%" class of
 * bug from resurfacing anywhere totals or per-row rates are aggregated or displayed.
 */
export function clampRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio < 0) return 0;
  return ratio > 1 ? 1 : ratio;
}

/**
 * Single factsource for headline totals: visits = Σ channel.visits, applications = Σ
 * channel.goalReaches, conversionRate = applications / visits (clamped to ≤ 100%). Pure and
 * deterministic.
 */
export function periodTotals(channels: readonly ChannelStat[]): PeriodTotals {
  let visits = 0;
  let applications = 0;
  for (const c of channels) {
    visits += c.visits;
    applications += c.goalReaches;
  }
  const conversionRate = visits === 0 ? 0 : clampRatio(applications / visits);
  return { visits, applications, conversionRate };
}
