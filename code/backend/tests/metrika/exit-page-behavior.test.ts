import { describe, it, expect, vi } from 'vitest';
import { exitPageBehavior } from '../../src/metrika/queries/exit-page-behavior';
import type { MetrikaClient } from '../../src/metrika/client';

function fakeClient(fixture: unknown): MetrikaClient {
  return { get: vi.fn(async () => fixture) } as unknown as MetrikaClient;
}

describe('exitPageBehavior', () => {
  it('maps exit-page rows without goal metrics', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: '/checkout' }], metrics: [40, 35, 60] }],
    });
    const { stats } = await exitPageBehavior(client, {
      counterId: 1,
      from: '2025-01-01',
      to: '2025-01-01',
    });
    expect(stats[0]).toEqual({
      date: '2025-01-01',
      page: '/checkout',
      visits: 40,
      users: 35,
      bounceRate: 0.6,
      goalReaches: 0,
      conversionRate: 0,
    });
  });

  it('includes goal metrics when goalId is set', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: '/checkout' }], metrics: [40, 35, 60, 2, 5] }],
    });
    const { stats } = await exitPageBehavior(client, {
      counterId: 1,
      from: '2025-01-02',
      to: '2025-01-02',
      goalId: 80,
    });
    expect(stats[0]?.goalReaches).toBe(2);
    expect(stats[0]?.conversionRate).toBe(0.05);
  });

  it('defaults null goal metrics to 0 even when goalId is set', async () => {
    const client = fakeClient({
      data: [{ dimensions: [{ name: '/checkout' }], metrics: [40, 35, 0.6, null, null] }],
    });
    const { stats } = await exitPageBehavior(client, {
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
    const { stats } = await exitPageBehavior(client, {
      counterId: 1,
      from: '2025-01-03',
      to: '2025-01-03',
    });
    expect(stats[0]).toMatchObject({ page: '(none)', visits: 0, users: 0, bounceRate: 0 });
  });
});
