import type { ChannelStat, B2bDeal } from '@pca/shared';
import { KPI_TARGET_PAID_TICKETS, periodTotals } from '@pca/shared';
import { intTooltip } from './echart-format';

export interface OverviewKpi {
  readonly target: number;
  readonly applications: number;
  readonly b2bPaid: number;
  readonly gap: number;
}

/** KPI strip: target, B2C applications, B2B paid, gap.
 * Gap = target - b2bPaid (заявка ≠ оплата — gap считается только по оплаченным билетам).
 * applications показывается отдельно как «верхняя оценка» потенциала. */
export function summarizeChannels(stats: ChannelStat[], deals: B2bDeal[] = []): OverviewKpi {
  // applications comes from the single factsource (periodTotals) so the KPI strip, Funnel and Goals
  // headline "Заявки B2C" numbers are guaranteed identical.
  const { applications } = periodTotals(stats);
  const b2bPaid = deals.filter((d) => d.stage === 'paid').reduce((acc, d) => acc + d.tickets, 0);
  return {
    target: KPI_TARGET_PAID_TICKETS,
    applications,
    b2bPaid,
    gap: KPI_TARGET_PAID_TICKETS - b2bPaid,
  };
}

export interface WeakSpot {
  readonly channel: string;
  readonly visits: number;
  readonly conversionRate: number;
}

/**
 * Weak spots: channels that pull real traffic but convert below the dataset's overall rate — the
 * biggest "leaks" to fix first. Aggregates per channel, keeps those with visits > 0 and a
 * conversion rate below the overall (total reaches / total visits), sorted by visits desc (top 5).
 * Pure and deterministic.
 */
export function weakSpots(stats: ChannelStat[]): WeakSpot[] {
  const map = new Map<string, { visits: number; reaches: number }>();
  let totalVisits = 0;
  let totalReaches = 0;
  for (const s of stats) {
    const cur = map.get(s.channel) ?? { visits: 0, reaches: 0 };
    map.set(s.channel, { visits: cur.visits + s.visits, reaches: cur.reaches + s.goalReaches });
    totalVisits += s.visits;
    totalReaches += s.goalReaches;
  }
  const overallCr = totalVisits === 0 ? 0 : totalReaches / totalVisits;
  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      visits: v.visits,
      conversionRate: v.visits === 0 ? 0 : v.reaches / v.visits,
    }))
    .filter((c) => c.visits > 0 && c.conversionRate < overallCr)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);
}

/** ECharts pie option: visits by channel. */
export function channelMixOption(stats: ChannelStat[]): object {
  const byChannel = new Map<string, number>();
  for (const s of stats) byChannel.set(s.channel, (byChannel.get(s.channel) ?? 0) + s.visits);
  return {
    tooltip: { trigger: 'item', ...intTooltip },
    legend: { data: [...byChannel.keys()], bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: [...byChannel].map(([name, value]) => ({ name, value })),
      },
    ],
  };
}

/** ECharts line option: daily goal reaches over the period. */
export function dailyReachesOption(stats: ChannelStat[]): object {
  const byDate = new Map<string, number>();
  for (const s of stats) byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.goalReaches);
  // Default lexicographic sort on ISO dates (no comparator branch); keys are Map keys, so the
  // lookup is always defined.
  const keys = [...byDate.keys()].sort();
  return {
    tooltip: { trigger: 'axis', ...intTooltip },
    xAxis: { type: 'category', data: keys },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, data: keys.map((k) => byDate.get(k) as number) }],
  };
}
