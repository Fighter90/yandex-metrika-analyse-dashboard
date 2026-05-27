import { describe, it, expect } from 'vitest';
import type { ChannelStat, UtmStat } from '@pca/shared';
import {
  utmCoverage,
  channelRows,
  channelBarOption,
  channelVisitsVsReachesOption,
  utmRows,
} from './traffic';

function stat(over: Partial<ChannelStat>): ChannelStat {
  return {
    date: '2025-01-01',
    channel: 'podcast',
    utmSource: 'podcast',
    utmMedium: null,
    utmCampaign: null,
    visits: 10,
    users: 9,
    bounceRate: 0.2,
    avgDuration: 60,
    goalReaches: 1,
    conversionRate: 0.1,
    ...over,
  };
}

function ustat(over: Partial<UtmStat>): UtmStat {
  return {
    date: '2025-01-01',
    utmSource: 'tg',
    utmMedium: 'cpc',
    utmCampaign: 'spring',
    visits: 10,
    users: 9,
    goalReaches: 1,
    conversionRate: 0.1,
    ...over,
  };
}

describe('utmCoverage (visit-weighted from utm_stats)', () => {
  it('is 0/low for an empty set', () => {
    expect(utmCoverage([])).toEqual({ withUtm: 0, withoutUtm: 0, ratio: 0, low: true });
  });

  it('counts UTM-tagged visits against total channel visits (M-004 fix)', () => {
    // 100 total channel visits; 40 visits carry a real UTM source → 40% coverage (low).
    const cov = utmCoverage(
      [stat({ visits: 100, utmSource: null })],
      [ustat({ utmSource: 'tg', visits: 40 })],
    );
    expect(cov.withUtm).toBe(40);
    expect(cov.withoutUtm).toBe(60);
    expect(cov.ratio).toBeCloseTo(0.4, 5);
    expect(cov.low).toBe(true);
  });

  it('excludes the «(none)» source bucket from the numerator', () => {
    const cov = utmCoverage(
      [stat({ visits: 100, utmSource: null })],
      [ustat({ utmSource: '(none)', visits: 90 }), ustat({ utmSource: 'tg', visits: 80 })],
    );
    expect(cov.withUtm).toBe(80); // only the real source counts
    expect(cov.ratio).toBeCloseTo(0.8, 5);
    expect(cov.low).toBe(false);
  });

  it('clamps coverage to 100% when tagged visits exceed channel visits', () => {
    const cov = utmCoverage(
      [stat({ visits: 50, utmSource: null })],
      [ustat({ utmSource: 'tg', visits: 90 })],
    );
    expect(cov.withUtm).toBe(50);
    expect(cov.withoutUtm).toBe(0);
    expect(cov.ratio).toBe(1);
    expect(cov.low).toBe(false);
  });
});

describe('channelRows', () => {
  it('aggregates by channel, sorts by visits desc, computes CR (incl. zero-visit guard)', () => {
    const rows = channelRows([
      stat({ channel: 'podcast', visits: 10, goalReaches: 1 }),
      stat({ channel: 'podcast', visits: 30, goalReaches: 2 }),
      stat({ channel: 'direct', visits: 5, goalReaches: 1 }),
      stat({ channel: 'empty', visits: 0, goalReaches: 0 }),
    ]);
    expect(rows[0]?.channel).toBe('podcast');
    expect(rows[0]?.visits).toBe(40);
    expect(rows[0]?.conversionRate).toBeCloseTo(3 / 40);
    expect(rows.find((r) => r.channel === 'empty')?.conversionRate).toBe(0);
  });
});

const utmStat = (over: Partial<UtmStat>): UtmStat => ({
  date: '2025-01-01',
  utmSource: 'vk',
  utmMedium: 'cpc',
  utmCampaign: 'spring',
  visits: 10,
  users: 9,
  goalReaches: 1,
  conversionRate: 0.1,
  ...over,
});

describe('utmRows', () => {
  it('aggregates by source/medium/campaign across days, sorts by visits desc, guards zero visits', () => {
    const rows = utmRows([
      utmStat({ date: '2025-01-01', visits: 10, goalReaches: 1 }),
      utmStat({ date: '2025-01-02', visits: 30, goalReaches: 2 }), // same triple → merges
      utmStat({
        utmSource: 'tg',
        utmMedium: 'social',
        utmCampaign: 'launch',
        visits: 5,
        goalReaches: 1,
      }),
      utmStat({
        utmSource: 'none',
        utmMedium: 'none',
        utmCampaign: 'none',
        visits: 0,
        goalReaches: 0,
      }),
    ]);
    expect(rows[0]?.source).toBe('vk');
    expect(rows[0]?.visits).toBe(40);
    expect(rows[0]?.conversionRate).toBeCloseTo(3 / 40);
    expect(rows.find((r) => r.source === 'none')?.conversionRate).toBe(0);
  });
});

describe('channelBarOption', () => {
  it('maps channels to a bar series', () => {
    const o = channelBarOption(channelRows([stat({ channel: 'podcast', visits: 10 })])) as {
      xAxis: { data: string[]; axisLabel: { rotate: number; formatter: (v: string) => string } };
      series: { data: { value: number; itemStyle: { color: string } }[] }[];
    };
    expect(o.xAxis.data).toEqual(['podcast']);
    expect(o.series[0]?.data[0]?.value).toBe(10);
    expect(o.series[0]?.data[0]?.itemStyle.color).toMatch(/^#[0-9A-F]{6}$/i);
    // x labels are rotated and long names truncated; short names pass through unchanged.
    expect(o.xAxis.axisLabel.rotate).toBe(30);
    expect(o.xAxis.axisLabel.formatter('короткий')).toBe('короткий');
    expect(o.xAxis.axisLabel.formatter('очень длинное название канала')).toMatch(/…$/);
  });
});

describe('channelVisitsVsReachesOption', () => {
  it('builds a two-series (visits + applications) grouped bar with a legend', () => {
    const rows = channelRows([stat({ channel: 'podcast', visits: 10, goalReaches: 3 })]);
    const o = channelVisitsVsReachesOption(rows) as {
      legend: { data: string[] };
      xAxis: { data: string[] };
      series: { name: string; data: number[] }[];
    };
    expect(o.legend.data).toEqual(['Визиты', 'Заявки']);
    expect(o.xAxis.data).toEqual(['podcast']);
    expect(o.series.map((s) => s.name)).toEqual(['Визиты', 'Заявки']);
    expect(o.series[0]?.data).toEqual([10]);
    expect(o.series[1]?.data).toEqual([3]);
  });
});
