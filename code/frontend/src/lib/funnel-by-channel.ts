import type { ChannelStat } from '@pca/shared';
import { intTooltip } from './echart-format';

/** How many channels (by visits) the by-channel funnel chart keeps. */
export const FUNNEL_BY_CHANNEL_TOP = 8;

export interface ChannelFunnelRow {
  readonly channel: string;
  readonly visits: number;
  readonly reaches: number;
}

/**
 * Aggregate per channel (Σvisits, Σreaches), highest visits first, capped at the top
 * {@link FUNNEL_BY_CHANNEL_TOP}. Exported for unit testing of the aggregation independent of the
 * ECharts option shape.
 */
export function channelFunnelRows(channels: ChannelStat[]): ChannelFunnelRow[] {
  const map = new Map<string, { visits: number; reaches: number }>();
  for (const c of channels) {
    const cur = map.get(c.channel) ?? { visits: 0, reaches: 0 };
    map.set(c.channel, {
      visits: cur.visits + c.visits,
      reaches: cur.reaches + c.goalReaches,
    });
  }
  return [...map.entries()]
    .map(([channel, v]) => ({ channel, visits: v.visits, reaches: v.reaches }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, FUNNEL_BY_CHANNEL_TOP);
}

/**
 * ECharts grouped-bar option: «Визиты» vs «Заявки» per channel (top {@link FUNNEL_BY_CHANNEL_TOP}),
 * with a legend + integer tooltip — the funnel-by-channel view that answers «какой канал ведёт
 * посетителя дальше по воронке».
 */
export function funnelByChannelOption(channels: ChannelStat[]): object {
  const rows = channelFunnelRows(channels);
  return {
    tooltip: { trigger: 'axis', ...intTooltip },
    legend: { data: ['Визиты', 'Заявки'] },
    grid: { left: 48, right: 16, top: 32, bottom: 48 },
    xAxis: {
      type: 'category',
      data: rows.map((r) => r.channel),
      axisLabel: { interval: 0, rotate: 30 },
    },
    yAxis: { type: 'value' },
    series: [
      { name: 'Визиты', type: 'bar', data: rows.map((r) => r.visits) },
      { name: 'Заявки', type: 'bar', data: rows.map((r) => r.reaches) },
    ],
  };
}
