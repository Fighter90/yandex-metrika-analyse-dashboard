import { describe, it, expect } from 'vitest';
import type { ChannelStat } from '@pca/shared';
import { summarizeChannels, channelMixOption, dailyReachesOption } from './overview';

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
  it('sums goal reaches against the 300 target', () => {
    const kpi = summarizeChannels([stat({ goalReaches: 5 }), stat({ goalReaches: 3 })]);
    expect(kpi).toEqual({ target: 300, reaches: 8, gap: 292 });
  });
});

describe('channelMixOption', () => {
  it('aggregates visits by channel (incl. repeated channel)', () => {
    const o = channelMixOption([
      stat({ channel: 'podcast', visits: 10 }),
      stat({ channel: 'podcast', visits: 5 }),
      stat({ channel: 'direct', visits: 2 }),
    ]) as { series: { data: { name: string; value: number }[] }[] };
    expect(o.series[0]?.data).toEqual(
      expect.arrayContaining([
        { name: 'podcast', value: 15 },
        { name: 'direct', value: 2 },
      ]),
    );
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
