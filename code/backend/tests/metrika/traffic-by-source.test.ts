import { describe, it, expect, vi } from 'vitest';
import { trafficBySource, trafficMetrics } from '../../src/metrika/queries/traffic-by-source';
import type { MetrikaClient } from '../../src/metrika/client';

function fakeClient(fixture: unknown): MetrikaClient {
  return { get: vi.fn(async () => fixture) } as unknown as MetrikaClient;
}

describe('trafficMetrics', () => {
  it('returns the base four metrics without a goal', () => {
    expect(trafficMetrics().split(',')).toHaveLength(4);
  });

  it('appends goal metrics when a goalId is given', () => {
    const metrics = trafficMetrics(80);
    expect(metrics).toContain('ym:s:goal80reaches');
    expect(metrics).toContain('ym:s:goal80conversionRate');
  });
});

describe('trafficBySource', () => {
  it('maps rows to ChannelStat without goal metrics', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: 'podcast' }, { name: 'rss' }], metrics: [100, 90, 0.2, 65] }],
    });
    const { stats } = await trafficBySource(client, {
      counterId: 1,
      from: '2025-01-01',
      to: '2025-01-01',
    });
    expect(stats[0]).toMatchObject({
      date: '2025-01-01',
      channel: 'podcast',
      visits: 100,
      users: 90,
      goalReaches: 0,
      conversionRate: 0,
    });
  });

  it('includes goal metrics when goalId is set', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: 'podcast' }], metrics: [100, 90, 0.2, 65, 5, 0.05] }],
    });
    const { stats } = await trafficBySource(client, {
      counterId: 1,
      from: '2025-01-02',
      to: '2025-01-02',
      goalId: 80,
    });
    expect(stats[0]?.goalReaches).toBe(5);
    expect(stats[0]?.conversionRate).toBe(0.05);
  });

  it('defaults null metrics to 0 and a missing dimension name to "unknown"', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: null }], metrics: [null, null, null, null] }],
    });
    const { stats } = await trafficBySource(client, {
      counterId: 1,
      from: '2025-01-03',
      to: '2025-01-03',
    });
    expect(stats[0]?.channel).toBe('unknown');
    expect(stats[0]?.visits).toBe(0);
  });
});
