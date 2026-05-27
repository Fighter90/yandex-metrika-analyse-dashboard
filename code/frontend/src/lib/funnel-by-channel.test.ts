import { describe, it, expect } from 'vitest';
import type { ChannelStat } from '@pca/shared';
import {
  channelFunnelRows,
  funnelByChannelOption,
  FUNNEL_BY_CHANNEL_TOP,
} from './funnel-by-channel';

const stat = (over: Partial<ChannelStat>): ChannelStat => ({
  date: '2025-01-01',
  channel: 'podcast',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  visits: 10,
  users: 9,
  bounceRate: 0.2,
  avgDuration: 60,
  goalReaches: 1,
  conversionRate: 0.1,
  ...over,
});

describe('channelFunnelRows', () => {
  it('empty input → empty rows', () => {
    expect(channelFunnelRows([])).toEqual([]);
  });

  it('aggregates Σvisits/Σreaches per channel and sorts by visits desc', () => {
    const rows = channelFunnelRows([
      stat({ channel: 'podcast', visits: 10, goalReaches: 1 }),
      stat({ channel: 'podcast', visits: 30, goalReaches: 2 }),
      stat({ channel: 'direct', visits: 50, goalReaches: 5 }),
    ]);
    expect(rows[0]).toEqual({ channel: 'direct', visits: 50, reaches: 5 });
    expect(rows[1]).toEqual({ channel: 'podcast', visits: 40, reaches: 3 });
  });

  it(`caps at top ${FUNNEL_BY_CHANNEL_TOP} channels by visits`, () => {
    const many = Array.from({ length: FUNNEL_BY_CHANNEL_TOP + 3 }, (_, i) =>
      stat({ channel: `ch${i}`, visits: (i + 1) * 10 }),
    );
    const rows = channelFunnelRows(many);
    expect(rows).toHaveLength(FUNNEL_BY_CHANNEL_TOP);
    // highest-visits channel kept, lowest dropped
    expect(rows[0]?.channel).toBe(`ch${FUNNEL_BY_CHANNEL_TOP + 2}`);
    expect(rows.some((r) => r.channel === 'ch0')).toBe(false);
  });
});

describe('funnelByChannelOption', () => {
  it('builds two named series (Визиты, Заявки) with a legend + integer tooltip', () => {
    const o = funnelByChannelOption([stat({ channel: 'podcast', visits: 10, goalReaches: 3 })]) as {
      legend: { data: string[] };
      tooltip: { valueFormatter: (v: number) => string };
      xAxis: { data: string[] };
      series: { name: string; data: number[] }[];
    };
    expect(o.legend.data).toEqual(['Визиты', 'Заявки']);
    expect(o.xAxis.data).toEqual(['podcast']);
    expect(o.series.map((s) => s.name)).toEqual(['Визиты', 'Заявки']);
    expect(o.series[0]?.data).toEqual([10]);
    expect(o.series[1]?.data).toEqual([3]);
    expect(typeof o.tooltip.valueFormatter).toBe('function');
  });

  it('empty input → empty axis and series data', () => {
    const o = funnelByChannelOption([]) as {
      xAxis: { data: string[] };
      series: { data: number[] }[];
    };
    expect(o.xAxis.data).toEqual([]);
    expect(o.series[0]?.data).toEqual([]);
    expect(o.series[1]?.data).toEqual([]);
  });
});
