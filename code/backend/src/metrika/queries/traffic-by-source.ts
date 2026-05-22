import type { ChannelStat } from '@pca/shared';
import type { MetrikaClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { StatDataResponseSchema, type StatDataResponse } from '../schemas';
import { ratio } from './ratio';

export interface TrafficQueryOptions {
  readonly counterId: number;
  readonly from: string;
  readonly to: string;
  /** When set, goal reaches + conversion rate metrics are requested. */
  readonly goalId?: number;
}

type Row = StatDataResponse['data'][number];

function mapRow(row: Row, opts: TrafficQueryOptions): ChannelStat {
  const m = row.metrics;
  const hasGoal = opts.goalId !== undefined;
  return {
    date: opts.from,
    channel: row.dimensions[0]?.name ?? 'unknown',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    visits: m[0] ?? 0,
    users: m[1] ?? 0,
    bounceRate: ratio(m[2]),
    avgDuration: m[3] ?? 0,
    goalReaches: hasGoal ? (m[4] ?? 0) : 0,
    conversionRate: hasGoal ? ratio(m[5]) : 0,
  };
}

/** Build the metric list for a traffic-by-source query (goal metrics appended when goalId set). */
export function trafficMetrics(goalId?: number): string {
  const base = ['ym:s:visits', 'ym:s:users', 'ym:s:bounceRate', 'ym:s:avgVisitDurationSeconds'];
  if (goalId !== undefined) {
    base.push(`ym:s:goal${goalId}reaches`, `ym:s:goal${goalId}conversionRate`);
  }
  return base.join(',');
}

/** Fetch traffic broken down by last source, returning both the raw response and parsed stats. */
export async function trafficBySource(
  client: MetrikaClient,
  opts: TrafficQueryOptions,
): Promise<{ raw: StatDataResponse; stats: ChannelStat[] }> {
  const raw = await client.get(
    ENDPOINTS.statData,
    {
      ids: opts.counterId,
      dimensions: 'ym:s:lastTrafficSource,ym:s:lastSourceEngine',
      metrics: trafficMetrics(opts.goalId),
      date1: opts.from,
      date2: opts.to,
    },
    StatDataResponseSchema,
  );
  return { raw, stats: raw.data.map((row) => mapRow(row, opts)) };
}
