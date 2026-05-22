import type { ChannelStat } from '@pca/shared';
import { KPI_TARGET_PAID_TICKETS } from '@pca/shared';

export interface OverviewKpi {
  readonly target: number;
  readonly reaches: number;
  readonly gap: number;
}

/** KPI strip: total goal reaches (заявки) vs the 300 target. */
export function summarizeChannels(stats: ChannelStat[]): OverviewKpi {
  const reaches = stats.reduce((acc, s) => acc + s.goalReaches, 0);
  return { target: KPI_TARGET_PAID_TICKETS, reaches, gap: KPI_TARGET_PAID_TICKETS - reaches };
}

/** ECharts pie option: visits by channel. */
export function channelMixOption(stats: ChannelStat[]): object {
  const byChannel = new Map<string, number>();
  for (const s of stats) byChannel.set(s.channel, (byChannel.get(s.channel) ?? 0) + s.visits);
  return {
    tooltip: { trigger: 'item' },
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
  const dates = [...byDate.keys()].sort();
  return {
    xAxis: { type: 'category', data: dates },
    yAxis: { type: 'value' },
    series: [{ type: 'line', smooth: true, data: dates.map((d) => byDate.get(d) ?? 0) }],
  };
}
