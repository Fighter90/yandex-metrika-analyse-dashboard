import { describe, it, expect } from 'vitest';
import type { ChannelStat, B2bDeal } from '@pca/shared';
import { buildFunnel, funnelOption } from './funnel';

const channel = (over: Partial<ChannelStat>): ChannelStat => ({
  date: '2025-01-01',
  channel: 'podcast',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  visits: 0,
  users: 0,
  bounceRate: 0,
  avgDuration: 0,
  goalReaches: 0,
  conversionRate: 0,
  ...over,
});

const deal = (over: Partial<B2bDeal>): B2bDeal => ({
  id: 1,
  company: 'Acme',
  tickets: 0,
  stage: 'lead',
  dateAdded: '2025-01-01',
  ...over,
});

describe('buildFunnel', () => {
  it('computes the four stages and per-stage conversion from populated data', () => {
    const stats = [channel({ visits: 1000, goalReaches: 100 })];
    const deals = [
      deal({ tickets: 40, stage: 'invoiced' }),
      deal({ id: 2, tickets: 20, stage: 'paid' }),
    ];
    const stages = buildFunnel(stats, deals);

    expect(stages.map((s) => [s.label, s.value])).toEqual([
      ['Визиты', 1000],
      ['Заявки B2C (goal reaches)', 100],
      ['Билеты B2B (в работе)', 60],
      ['Оплачено B2B', 20],
    ]);
    // First stage is always 100%; the rest are ratios of the previous stage.
    expect(stages[0]?.fromPrev).toBe(1);
    expect(stages[1]?.fromPrev).toBeCloseTo(0.1);
    expect(stages[2]?.fromPrev).toBeCloseTo(0.6);
    expect(stages[3]?.fromPrev).toBeCloseTo(20 / 60);
  });

  it('returns 0 conversion when the previous stage is empty (no divide-by-zero)', () => {
    const stages = buildFunnel([], []);
    expect(stages.map((s) => s.value)).toEqual([0, 0, 0, 0]);
    expect(stages[0]?.fromPrev).toBe(1);
    expect(stages[1]?.fromPrev).toBe(0);
    expect(stages[3]?.fromPrev).toBe(0);
  });
});

describe('funnelOption', () => {
  it('maps stages to an ECharts funnel series in order', () => {
    const option = funnelOption(buildFunnel([channel({ visits: 10 })], [])) as {
      series: { type: string; sort: string; data: { name: string; value: number }[] }[];
    };
    expect(option.series[0]?.type).toBe('funnel');
    expect(option.series[0]?.sort).toBe('none');
    expect(option.series[0]?.data[0]).toEqual({ name: 'Визиты', value: 10 });
  });
});
