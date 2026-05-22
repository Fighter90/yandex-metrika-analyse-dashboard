import type { GeoDeviceStat } from '@pca/shared';
import { DIMENSION_NONE } from '@pca/shared';
import type { MetrikaClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { StatDataResponseSchema, type StatDataResponse } from '../schemas';
import { ratio } from './ratio';

export interface GeoDeviceQueryOptions {
  readonly counterId: number;
  readonly from: string;
  readonly to: string;
  /** When set, goal reaches + conversion rate metrics are requested. */
  readonly goalId?: number;
}

type Row = StatDataResponse['data'][number];

/** Missing dimension values come back as null — normalise to the `(none)` sentinel. */
function dim(row: Row, i: number): string {
  return row.dimensions[i]?.name ?? DIMENSION_NONE;
}

function mapRow(row: Row, opts: GeoDeviceQueryOptions): GeoDeviceStat {
  const m = row.metrics;
  const hasGoal = opts.goalId !== undefined;
  return {
    date: opts.from,
    country: dim(row, 0),
    device: dim(row, 1),
    visits: m[0] ?? 0,
    users: m[1] ?? 0,
    goalReaches: hasGoal ? (m[2] ?? 0) : 0,
    conversionRate: hasGoal ? ratio(m[3]) : 0,
  };
}

/** Build the metric list for a geo/device query (goal metrics appended when goalId set). */
export function geoDeviceMetrics(goalId?: number): string {
  const base = ['ym:s:visits', 'ym:s:users'];
  if (goalId !== undefined) {
    base.push(`ym:s:goal${goalId}reaches`, `ym:s:goal${goalId}conversionRate`);
  }
  return base.join(',');
}

/** Fetch traffic broken down by country + device category; returns raw response + parsed stats. */
export async function geoDeviceBreakdown(
  client: MetrikaClient,
  opts: GeoDeviceQueryOptions,
): Promise<{ raw: StatDataResponse; stats: GeoDeviceStat[] }> {
  const raw = await client.get(
    ENDPOINTS.statData,
    {
      ids: opts.counterId,
      dimensions: 'ym:s:regionCountry,ym:s:deviceCategory',
      metrics: geoDeviceMetrics(opts.goalId),
      date1: opts.from,
      date2: opts.to,
    },
    StatDataResponseSchema,
  );
  return { raw, stats: raw.data.map((row) => mapRow(row, opts)) };
}
