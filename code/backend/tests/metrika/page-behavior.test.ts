import { describe, it, expect, vi } from 'vitest';
import { pageBehavior, pageMetrics } from '../../src/metrika/queries/page-behavior';
import type { MetrikaClient } from '../../src/metrika/client';

function fakeClient(fixture: unknown): MetrikaClient {
  return { get: vi.fn(async () => fixture) } as unknown as MetrikaClient;
}

describe('pageMetrics', () => {
  it('returns the base three metrics without a goal', () => {
    expect(pageMetrics().split(',')).toEqual(['ym:s:visits', 'ym:s:users', 'ym:s:bounceRate']);
  });

  it('appends goal metrics when a goalId is given', () => {
    const metrics = pageMetrics(80);
    expect(metrics).toContain('ym:s:goal80reaches');
    expect(metrics).toContain('ym:s:goal80conversionRate');
  });
});

describe('pageBehavior', () => {
  it('maps entry-page rows without goal metrics', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: '/lp' }], metrics: [100, 90, 30] }],
    });
    const { stats } = await pageBehavior(client, {
      counterId: 1,
      from: '2025-01-01',
      to: '2025-01-01',
    });
    expect(stats[0]).toEqual({
      date: '2025-01-01',
      page: '/lp',
      visits: 100,
      users: 90,
      bounceRate: 0.3,
      goalReaches: 0,
      conversionRate: 0,
    });
  });

  it('includes goal metrics when goalId is set', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: '/lp' }], metrics: [100, 90, 30, 5, 5] }],
    });
    const { stats } = await pageBehavior(client, {
      counterId: 1,
      from: '2025-01-02',
      to: '2025-01-02',
      goalId: 80,
    });
    expect(stats[0]?.goalReaches).toBe(5);
    expect(stats[0]?.conversionRate).toBe(0.05);
  });

  it('defaults null goal metrics to 0 even when goalId is set', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: '/lp' }], metrics: [100, 90, 0.3, null, null] }],
    });
    const { stats } = await pageBehavior(client, {
      counterId: 1,
      from: '2025-01-04',
      to: '2025-01-04',
      goalId: 80,
    });
    expect(stats[0]?.goalReaches).toBe(0);
    expect(stats[0]?.conversionRate).toBe(0);
  });

  it('normalises a missing page to "(none)" and null metrics to 0', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: null }], metrics: [null, null, null] }],
    });
    const { stats } = await pageBehavior(client, {
      counterId: 1,
      from: '2025-01-03',
      to: '2025-01-03',
    });
    expect(stats[0]).toMatchObject({ page: '(none)', visits: 0, users: 0, bounceRate: 0 });
  });
});
