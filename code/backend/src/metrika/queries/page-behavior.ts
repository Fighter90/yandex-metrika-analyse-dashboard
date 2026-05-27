import type { PageStat } from '@pca/shared';
import { DIMENSION_NONE } from '@pca/shared';
import type { MetrikaClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { StatDataResponseSchema, type StatDataResponse } from '../schemas';
import { ratio } from './ratio';

export interface PageQueryOptions {
  readonly counterId: number;
  readonly from: string;
  readonly to: string;
  /** When set, goal reaches + conversion rate metrics are requested. */
  readonly goalId?: number;
}

type Row = StatDataResponse['data'][number];

function mapRow(row: Row, opts: PageQueryOptions): PageStat {
  const m = row.metrics;
  const hasGoal = opts.goalId !== undefined;
  return {
    date: opts.from,
    page: row.dimensions[0]?.name ?? DIMENSION_NONE,
    visits: m[0] ?? 0,
    users: m[1] ?? 0,
    bounceRate: ratio(m[2]),
    goalReaches: hasGoal ? (m[3] ?? 0) : 0,
    conversionRate: hasGoal ? ratio(m[4]) : 0,
  };
}

/** Build the metric list for an entry-page query (goal metrics appended when goalId set). */
export function pageMetrics(goalId?: number): string {
  const base = ['ym:s:visits', 'ym:s:users', 'ym:s:bounceRate'];
  if (goalId !== undefined) {
    base.push(`ym:s:goal${goalId}reaches`, `ym:s:goal${goalId}conversionRate`);
  }
  return base.join(',');
}

/** Fetch behaviour broken down by entry page (startURL); returns raw response + parsed stats. */
export async function pageBehavior(
  client: MetrikaClient,
  opts: PageQueryOptions,
): Promise<{ raw: StatDataResponse; stats: PageStat[] }> {
  const raw = await client.get(
    ENDPOINTS.statData,
    {
      ids: opts.counterId,
      dimensions: 'ym:s:startURL',
      metrics: pageMetrics(opts.goalId),
      date1: opts.from,
      date2: opts.to,
      attribution: 'lastsign',
    },
    StatDataResponseSchema,
  );
  return { raw, stats: raw.data.map((row) => mapRow(row, opts)) };
}
