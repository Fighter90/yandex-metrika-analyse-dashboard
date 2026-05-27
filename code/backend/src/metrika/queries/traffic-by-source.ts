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

/**
 * Collapse rows to one per channel. The query groups by (lastTrafficSource, lastSourceEngine), so a
 * single channel like "Search engine traffic" arrives as several rows (Google, Yandex, …). We only
 * key channel_stats by source, so without this aggregation those sibling rows collapse on the
 * primary key and INSERT OR REPLACE keeps just the last one — silently dropping the others' visits.
 * Visits/users/reaches are summed; bounce + duration are visit-weighted; CR is recomputed.
 */
interface ChannelAcc {
  date: string;
  channel: string;
  visits: number;
  users: number;
  goalReaches: number;
  wBounce: number;
  wDur: number;
}

export function aggregateByChannel(stats: ChannelStat[]): ChannelStat[] {
  const acc = new Map<string, ChannelAcc>();
  for (const s of stats) {
    const cur = acc.get(s.channel);
    if (!cur) {
      acc.set(s.channel, {
        date: s.date,
        channel: s.channel,
        visits: s.visits,
        users: s.users,
        goalReaches: s.goalReaches,
        wBounce: s.bounceRate * s.visits,
        wDur: s.avgDuration * s.visits,
      });
    } else {
      cur.visits += s.visits;
      cur.users += s.users;
      cur.goalReaches += s.goalReaches;
      cur.wBounce += s.bounceRate * s.visits;
      cur.wDur += s.avgDuration * s.visits;
    }
  }
  return [...acc.values()].map((c) => ({
    date: c.date,
    channel: c.channel,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    visits: c.visits,
    users: c.users,
    bounceRate: c.visits > 0 ? c.wBounce / c.visits : 0,
    avgDuration: c.visits > 0 ? c.wDur / c.visits : 0,
    goalReaches: c.goalReaches,
    conversionRate: c.visits > 0 ? c.goalReaches / c.visits : 0,
  }));
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
      // Group by traffic source only. Querying lastSourceEngine too would split one channel into
      // several rows (Search = Google + Yandex …) — visits are additive but users are NOT (the same
      // person across engines counts once per source), so a single-dimension query gives Metrika's
      // native, deduplicated visits AND users per channel.
      dimensions: 'ym:s:lastTrafficSource',
      metrics: trafficMetrics(opts.goalId),
      date1: opts.from,
      date2: opts.to,
      attribution: 'lastsign',
    },
    StatDataResponseSchema,
  );
  return { raw, stats: aggregateByChannel(raw.data.map((row) => mapRow(row, opts))) };
}
