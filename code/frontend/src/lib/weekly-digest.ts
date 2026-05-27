import type { ChannelStat } from '@pca/shared';
import { dailySeries, weekOverWeek } from './trends';
import { weakSpots, type WeakSpot } from './overview';

export interface ChannelVisits {
  readonly channel: string;
  readonly visits: number;
}

/**
 * A compact "what happened this week" summary for the Overview page. Headline metrics are
 * week-over-week (last 7 days vs the 7 before); the top channel and weak spot are computed over
 * the last-7-day window so the digest reads as a single coherent weekly snapshot. Pure and
 * fully unit-testable.
 */
export interface WeeklyDigestData {
  readonly hasData: boolean;
  readonly visits: number;
  readonly visitsDelta: number;
  readonly applications: number;
  readonly applicationsDelta: number;
  readonly topChannel: ChannelVisits | null;
  readonly topWeakSpot: WeakSpot | null;
}

export function weeklyDigest(stats: ChannelStat[]): WeeklyDigestData {
  const wow = weekOverWeek(stats);
  const series = dailySeries(stats);
  const last7Dates = new Set(series.slice(-7).map((p) => p.date));
  const last7 = stats.filter((s) => last7Dates.has(s.date));

  const byChannel = new Map<string, number>();
  for (const s of last7) byChannel.set(s.channel, (byChannel.get(s.channel) ?? 0) + s.visits);
  const top = [...byChannel.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    hasData: series.length > 0,
    visits: wow.currentVisits,
    visitsDelta: wow.visitsDelta,
    applications: wow.currentReaches,
    applicationsDelta: wow.reachesDelta,
    topChannel: top ? { channel: top[0], visits: top[1] } : null,
    topWeakSpot: weakSpots(last7)[0] ?? null,
  };
}
