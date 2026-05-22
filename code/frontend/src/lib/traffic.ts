import type { ChannelStat } from '@pca/shared';

/** Segments with UTM coverage below this ratio are flagged (mirrors backend LOW_UTM_COVERAGE_RATIO). */
export const LOW_UTM_COVERAGE_RATIO = 0.7;

export interface ChannelRow {
  readonly channel: string;
  readonly visits: number;
  readonly users: number;
  readonly goalReaches: number;
  readonly conversionRate: number;
}

export interface UtmCoverage {
  readonly withUtm: number;
  readonly withoutUtm: number;
  readonly ratio: number;
  readonly low: boolean;
}

/** Share of rows that carry a utm_source; flags low coverage. */
export function utmCoverage(stats: ChannelStat[]): UtmCoverage {
  let withUtm = 0;
  for (const s of stats) if (s.utmSource) withUtm += 1;
  const total = stats.length;
  const ratio = total === 0 ? 0 : withUtm / total;
  return { withUtm, withoutUtm: total - withUtm, ratio, low: ratio < LOW_UTM_COVERAGE_RATIO };
}

/** Aggregate per channel, highest visits first; conversionRate = reaches / visits. */
export function channelRows(stats: ChannelStat[]): ChannelRow[] {
  const map = new Map<string, { visits: number; users: number; goalReaches: number }>();
  for (const s of stats) {
    const cur = map.get(s.channel) ?? { visits: 0, users: 0, goalReaches: 0 };
    map.set(s.channel, {
      visits: cur.visits + s.visits,
      users: cur.users + s.users,
      goalReaches: cur.goalReaches + s.goalReaches,
    });
  }
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      visits: v.visits,
      users: v.users,
      goalReaches: v.goalReaches,
      conversionRate: v.visits === 0 ? 0 : v.goalReaches / v.visits,
    }))
    .sort((a, b) => b.visits - a.visits);
}

/** ECharts bar option: visits by channel. */
export function channelBarOption(rows: ChannelRow[]): object {
  return {
    tooltip: {},
    xAxis: { type: 'category', data: rows.map((r) => r.channel) },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: rows.map((r) => r.visits) }],
  };
}
