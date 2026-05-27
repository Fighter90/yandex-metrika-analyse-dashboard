import { describe, it, expect } from 'vitest';
import type { ChannelStat } from '@pca/shared';
import { weeklyDigest } from './weekly-digest';

const stat = (date: string, channel: string, over: Partial<ChannelStat> = {}): ChannelStat => ({
  date,
  channel,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  visits: 100,
  users: 90,
  bounceRate: 0.2,
  avgDuration: 60,
  goalReaches: 5,
  conversionRate: 0.05,
  ...over,
});

/** 14 consecutive days starting 2025-01-01. */
const days = Array.from({ length: 14 }, (_, i) => `2025-01-${String(i + 1).padStart(2, '0')}`);

describe('weeklyDigest', () => {
  it('returns an empty, no-data digest for no stats', () => {
    const d = weeklyDigest([]);
    expect(d.hasData).toBe(false);
    expect(d.visits).toBe(0);
    expect(d.visitsDelta).toBe(0);
    expect(d.topChannel).toBeNull();
    expect(d.topWeakSpot).toBeNull();
  });

  it('computes WoW headline + top channel + top weak spot over the last 7 days', () => {
    const stats: ChannelStat[] = [];
    // previous week (days 0-6): 50 visits/day on "ads"
    for (const date of days.slice(0, 7))
      stats.push(stat(date, 'ads', { visits: 50, goalReaches: 5 }));
    // current week (days 7-13): 100 visits "ads" (low CR) + 20 visits "direct" (high CR)
    for (const date of days.slice(7)) {
      stats.push(stat(date, 'ads', { visits: 100, goalReaches: 1 }));
      stats.push(stat(date, 'direct', { visits: 20, goalReaches: 10 }));
    }
    const d = weeklyDigest(stats);
    expect(d.hasData).toBe(true);
    // current visits = 7*(100+20)=840, previous = 7*50=350 → delta = (840-350)/350
    expect(d.visits).toBe(840);
    expect(d.visitsDelta).toBeCloseTo((840 - 350) / 350);
    // top channel by visits in last 7 days is "ads"
    expect(d.topChannel).toEqual({ channel: 'ads', visits: 700 });
    // "ads" converts below the overall rate → it is the top weak spot
    expect(d.topWeakSpot?.channel).toBe('ads');
  });

  it('reports no weak spot when a single channel matches the overall rate', () => {
    const stats = days.map((date) => stat(date, 'ads'));
    const d = weeklyDigest(stats);
    expect(d.topChannel).toEqual({ channel: 'ads', visits: 700 });
    expect(d.topWeakSpot).toBeNull();
  });
});
