import { describe, it, expect } from 'vitest';
import type { ChannelStat, B2bDeal } from '@pca/shared';
import { summarizeChannels, channelMixOption, dailyReachesOption, weakSpots } from './overview';

function stat(over: Partial<ChannelStat>): ChannelStat {
  return {
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
  };
}

describe('summarizeChannels', () => {
  it('sums goal reaches and calculates gap from B2B paid (not applications)', () => {
    const deals: B2bDeal[] = [
      { id: 1, company: 'A', tickets: 10, stage: 'paid', dateAdded: '2025-01-01' },
      { id: 2, company: 'B', tickets: 5, stage: 'lead', dateAdded: '2025-01-01' },
    ];
    const kpi = summarizeChannels([stat({ goalReaches: 5 }), stat({ goalReaches: 3 })], deals);
    // gap = 300 - 10 (only paid B2B tickets count)
    expect(kpi).toEqual({ target: 300, applications: 8, b2bPaid: 10, gap: 290 });
  });

  it('defaults gap to 300 when no B2B deals exist', () => {
    const kpi = summarizeChannels([stat({ goalReaches: 5 })], []);
    expect(kpi).toEqual({ target: 300, applications: 5, b2bPaid: 0, gap: 300 });
  });
});

describe('weakSpots', () => {
  it('flags channels with traffic but below-overall conversion, sorted by visits desc', () => {
    // overall CR = (1+1+9) / (100+50+10) = 11/160 ≈ 0.069.
    // podcast CR 0.01 (<overall, high traffic), direct CR 0.02 (<overall), vip CR 0.9 (>overall).
    const spots = weakSpots([
      stat({ channel: 'podcast', visits: 100, goalReaches: 1 }),
      stat({ channel: 'direct', visits: 50, goalReaches: 1 }),
      stat({ channel: 'vip', visits: 10, goalReaches: 9 }),
      stat({ channel: 'empty', visits: 0, goalReaches: 0 }), // zero visits → CR 0, excluded
    ]);
    expect(spots.map((s) => s.channel)).toEqual(['podcast', 'direct']);
    expect(spots[0]?.conversionRate).toBeCloseTo(0.01);
  });

  it('returns an empty list when there is no data (no divide-by-zero)', () => {
    expect(weakSpots([])).toEqual([]);
  });
});

describe('channelMixOption', () => {
  it('aggregates visits by channel (incl. repeated channel)', () => {
    const o = channelMixOption([
      stat({ channel: 'podcast', visits: 10 }),
      stat({ channel: 'podcast', visits: 5 }),
      stat({ channel: 'direct', visits: 2 }),
    ]) as { series: { data: { name: string; value: number }[] }[] };
    const byName = new Map(o.series[0]?.data.map((d) => [d.name, d.value]));
    expect(byName.get('podcast')).toBe(15);
    expect(byName.get('direct')).toBe(2);
  });

  it('includes a legend with channel names', () => {
    const o = channelMixOption([
      stat({ channel: 'podcast', visits: 10 }),
      stat({ channel: 'direct', visits: 2 }),
    ]) as { legend: { data: string[] } };
    expect(o.legend.data).toContain('podcast');
    expect(o.legend.data).toContain('direct');
  });
});

describe('dailyReachesOption', () => {
  it('aggregates reaches by date, sorted (incl. repeated date)', () => {
    const o = dailyReachesOption([
      stat({ date: '2025-01-02', goalReaches: 2 }),
      stat({ date: '2025-01-01', goalReaches: 1 }),
      stat({ date: '2025-01-01', goalReaches: 3 }),
    ]) as { xAxis: { data: string[] }; series: { data: number[] }[] };
    expect(o.xAxis.data).toEqual(['2025-01-01', '2025-01-02']);
    expect(o.series[0]?.data).toEqual([4, 2]);
  });
});
