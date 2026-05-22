import { describe, it, expect, vi } from 'vitest';
import { utmBreakdown, utmMetrics } from '../../src/metrika/queries/utm-breakdown';
import type { MetrikaClient } from '../../src/metrika/client';

function fakeClient(fixture: unknown): MetrikaClient {
  return { get: vi.fn(async () => fixture) } as unknown as MetrikaClient;
}

describe('utmMetrics', () => {
  it('returns the base two metrics without a goal', () => {
    expect(utmMetrics().split(',')).toEqual(['ym:s:visits', 'ym:s:users']);
  });

  it('appends goal metrics when a goalId is given', () => {
    const metrics = utmMetrics(80);
    expect(metrics).toContain('ym:s:goal80reaches');
    expect(metrics).toContain('ym:s:goal80conversionRate');
  });
});

describe('utmBreakdown', () => {
  it('maps source/medium/campaign rows without goal metrics', async () => {
    const client = fakeClient({
      data: [
        {
          dimensions: [{ name: 'vk' }, { name: 'cpc' }, { name: 'spring' }],
          metrics: [100, 90],
        },
      ],
    });
    const { stats } = await utmBreakdown(client, {
      counterId: 1,
      from: '2025-01-01',
      to: '2025-01-01',
    });
    expect(stats[0]).toEqual({
      date: '2025-01-01',
      utmSource: 'vk',
      utmMedium: 'cpc',
      utmCampaign: 'spring',
      visits: 100,
      users: 90,
      goalReaches: 0,
      conversionRate: 0,
    });
  });

  it('includes goal metrics when goalId is set', async () => {
    const client = fakeClient({
      data: [
        {
          dimensions: [{ name: 'vk' }, { name: 'cpc' }, { name: 'spring' }],
          metrics: [100, 90, 7, 0.07],
        },
      ],
    });
    const { stats } = await utmBreakdown(client, {
      counterId: 1,
      from: '2025-01-02',
      to: '2025-01-02',
      goalId: 80,
    });
    expect(stats[0]?.goalReaches).toBe(7);
    expect(stats[0]?.conversionRate).toBe(0.07);
  });

  it('defaults null goal metrics to 0 even when goalId is set', async () => {
    const client = fakeClient({
      data: [
        {
          dimensions: [{ name: 'vk' }, { name: 'cpc' }, { name: 'spring' }],
          metrics: [100, 90, null, null],
        },
      ],
    });
    const { stats } = await utmBreakdown(client, {
      counterId: 1,
      from: '2025-01-04',
      to: '2025-01-04',
      goalId: 80,
    });
    expect(stats[0]?.goalReaches).toBe(0);
    expect(stats[0]?.conversionRate).toBe(0);
  });

  it('normalises missing dimensions to "(none)" and null metrics to 0', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: null }], metrics: [null, null] }],
    });
    const { stats } = await utmBreakdown(client, {
      counterId: 1,
      from: '2025-01-03',
      to: '2025-01-03',
    });
    expect(stats[0]).toMatchObject({
      utmSource: '(none)',
      utmMedium: '(none)',
      utmCampaign: '(none)',
      visits: 0,
      users: 0,
    });
  });
});
