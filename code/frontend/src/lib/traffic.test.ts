import { describe, it, expect } from 'vitest';
import type { ChannelStat } from '@pca/shared';
import { utmCoverage, channelRows, channelBarOption } from './traffic';

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

describe('utmCoverage', () => {
  it('is 0/low for an empty set', () => {
    expect(utmCoverage([])).toEqual({ withUtm: 0, withoutUtm: 0, ratio: 0, low: true });
  });

  it('flags low coverage below 70%', () => {
    const cov = utmCoverage([
      stat({ utmSource: 'x' }),
      stat({ utmSource: null }),
      stat({ utmSource: null }),
    ]);
    expect(cov.withUtm).toBe(1);
    expect(cov.withoutUtm).toBe(2);
    expect(cov.low).toBe(true);
  });

  it('does not flag when coverage is high', () => {
    const cov = utmCoverage([stat({ utmSource: 'a' }), stat({ utmSource: 'b' })]);
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

describe('channelBarOption', () => {
  it('maps channels to a bar series', () => {
    const o = channelBarOption(channelRows([stat({ channel: 'podcast', visits: 10 })])) as {
      xAxis: { data: string[] };
      series: { data: number[] }[];
    };
    expect(o.xAxis.data).toEqual(['podcast']);
    expect(o.series[0]?.data).toEqual([10]);
  });
});
