import type { ChannelStat } from '@pca/shared';
import { intTooltip } from './echart-format';

export interface DailyPoint {
  readonly date: string;
  readonly visits: number;
  readonly reaches: number;
}

/** Collapse channel rows into a per-day series (visits + goal reaches), sorted by ISO date. */
export function dailySeries(stats: ChannelStat[]): DailyPoint[] {
  const byDate = new Map<string, { visits: number; reaches: number }>();
  for (const s of stats) {
    const cur = byDate.get(s.date) ?? { visits: 0, reaches: 0 };
    byDate.set(s.date, { visits: cur.visits + s.visits, reaches: cur.reaches + s.goalReaches });
  }
  // Default lexicographic sort on ISO dates (no comparator branch); keys are Map keys, so the
  // lookup is always defined.
  return [...byDate.keys()].sort().map((date) => {
    const v = byDate.get(date) as { visits: number; reaches: number };
    return { date, visits: v.visits, reaches: v.reaches };
  });
}

export interface Wow {
  readonly currentVisits: number;
  readonly previousVisits: number;
  readonly visitsDelta: number;
  readonly currentReaches: number;
  readonly previousReaches: number;
  readonly reachesDelta: number;
}

function delta(current: number, previous: number): number {
  return previous === 0 ? 0 : (current - previous) / previous;
}

function sum(points: DailyPoint[], pick: (p: DailyPoint) => number): number {
  return points.reduce((acc, p) => acc + pick(p), 0);
}

/**
 * Week-over-week comparison: the most-recent 7 days in the data vs the 7 days before them. Deltas are
 * ratios `(current − previous) / previous` (0 when previous is 0). Pure and fully unit-testable.
 */
export function weekOverWeek(stats: ChannelStat[]): Wow {
  const series = dailySeries(stats);
  const current = series.slice(-7);
  const previous = series.slice(-14, -7);
  const currentVisits = sum(current, (p) => p.visits);
  const previousVisits = sum(previous, (p) => p.visits);
  const currentReaches = sum(current, (p) => p.reaches);
  const previousReaches = sum(previous, (p) => p.reaches);
  return {
    currentVisits,
    previousVisits,
    visitsDelta: delta(currentVisits, previousVisits),
    currentReaches,
    previousReaches,
    reachesDelta: delta(currentReaches, previousReaches),
  };
}

/** ECharts line option: daily visits + goal reaches over the period. */
export function trendsOption(series: DailyPoint[]): object {
  return {
    tooltip: { trigger: 'axis', ...intTooltip },
    legend: { data: ['Визиты', 'Заявки'] },
    xAxis: { type: 'category', data: series.map((p) => p.date) },
    yAxis: { type: 'value' },
    series: [
      { name: 'Визиты', type: 'line', smooth: true, data: series.map((p) => p.visits) },
      { name: 'Заявки', type: 'line', smooth: true, data: series.map((p) => p.reaches) },
    ],
  };
}
