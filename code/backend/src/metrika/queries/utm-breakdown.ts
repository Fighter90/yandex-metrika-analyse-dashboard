import type { UtmStat } from '@pca/shared';
import { UTM_NONE } from '@pca/shared';
import type { MetrikaClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { StatDataResponseSchema, type StatDataResponse } from '../schemas';
import { ratio } from './ratio';

export interface UtmQueryOptions {
  readonly counterId: number;
  readonly from: string;
  readonly to: string;
  /** When set, goal reaches + conversion rate metrics are requested. */
  readonly goalId?: number;
}

type Row = StatDataResponse['data'][number];

/** Missing dimension values come back as null — normalise to the `(none)` sentinel. */
function dim(row: Row, i: number): string {
  return row.dimensions[i]?.name ?? UTM_NONE;
}

function mapRow(row: Row, opts: UtmQueryOptions): UtmStat {
  const m = row.metrics;
  const hasGoal = opts.goalId !== undefined;
  return {
    date: opts.from,
    utmSource: dim(row, 0),
    utmMedium: dim(row, 1),
    utmCampaign: dim(row, 2),
    visits: m[0] ?? 0,
    users: m[1] ?? 0,
    goalReaches: hasGoal ? (m[2] ?? 0) : 0,
    conversionRate: hasGoal ? ratio(m[3]) : 0,
  };
}

/** Build the metric list for a UTM-breakdown query (goal metrics appended when goalId set). */
export function utmMetrics(goalId?: number): string {
  const base = ['ym:s:visits', 'ym:s:users'];
  if (goalId !== undefined) {
    base.push(`ym:s:goal${goalId}reaches`, `ym:s:goal${goalId}conversionRate`);
  }
  return base.join(',');
}

/** Fetch traffic broken down by UTM source/medium/campaign; returns raw response + parsed stats. */
export async function utmBreakdown(
  client: MetrikaClient,
  opts: UtmQueryOptions,
): Promise<{ raw: StatDataResponse; stats: UtmStat[] }> {
  const raw = await client.get(
    ENDPOINTS.statData,
    {
      ids: opts.counterId,
      dimensions: 'ym:s:UTMSource,ym:s:UTMMedium,ym:s:UTMCampaign',
      metrics: utmMetrics(opts.goalId),
      date1: opts.from,
      date2: opts.to,
    },
    StatDataResponseSchema,
  );
  return { raw, stats: raw.data.map((row) => mapRow(row, opts)) };
}
