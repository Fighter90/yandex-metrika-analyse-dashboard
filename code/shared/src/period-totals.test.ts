import { describe, it, expect } from 'vitest';
import type { ChannelStat } from './types/metrics';
import { periodTotals, clampRatio } from './period-totals';

const stat = (over: Partial<ChannelStat> = {}): ChannelStat => ({
  date: '2025-01-01',
  channel: 'podcast',
  utmSource: 'podcast',
  utmMedium: 'audio',
  utmCampaign: 'ep1',
  visits: 100,
  users: 90,
  bounceRate: 0.2,
  avgDuration: 65,
  goalReaches: 5,
  conversionRate: 0.05,
  ...over,
});

describe('clampRatio', () => {
  it('passes through ratios within [0, 1]', () => {
    expect(clampRatio(0)).toBe(0);
    expect(clampRatio(0.5)).toBe(0.5);
    expect(clampRatio(1)).toBe(1);
  });

  it('clamps ratios above 1 to 1 (100%)', () => {
    expect(clampRatio(2)).toBe(1);
    expect(clampRatio(123)).toBe(1);
  });

  it('floors negatives and non-finite values to 0', () => {
    expect(clampRatio(-0.5)).toBe(0);
    expect(clampRatio(Number.NaN)).toBe(0);
    expect(clampRatio(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('periodTotals', () => {
  it('sums visits and applications across channels and computes CR', () => {
    const t = periodTotals([
      stat({ visits: 100, goalReaches: 5 }),
      stat({ channel: 'direct', visits: 300, goalReaches: 15 }),
    ]);
    expect(t.visits).toBe(400);
    expect(t.applications).toBe(20);
    expect(t.conversionRate).toBeCloseTo(0.05, 10);
  });

  it('returns zeroes (no division) for an empty channel set', () => {
    expect(periodTotals([])).toEqual({ visits: 0, applications: 0, conversionRate: 0 });
  });

  it('clamps an implausible CR (applications > visits) to 100%', () => {
    const t = periodTotals([stat({ visits: 10, goalReaches: 20 })]);
    expect(t.conversionRate).toBe(1);
  });

  it('is the single factsource the three pages share: identical totals for one fixture', () => {
    const fixture = [
      stat({ channel: 'podcast', visits: 1000, goalReaches: 40 }),
      stat({ channel: 'search', visits: 500, goalReaches: 30 }),
    ];
    // Overview KPI, Funnel headline and Goals headline all call periodTotals(channels) — modelling
    // that here: three independent calls on the same fixture must agree byte-for-byte.
    const overview = periodTotals(fixture);
    const funnel = periodTotals(fixture);
    const goals = periodTotals(fixture);
    expect(overview).toEqual(funnel);
    expect(funnel).toEqual(goals);
    expect(overview.visits).toBe(1500);
    expect(overview.applications).toBe(70);
  });
});
