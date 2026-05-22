import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DB } from '../../src/db/connection';
import { MetricsRepo } from '../../src/db/repositories/metrics-repo';
import { SyncService } from '../../src/metrika/sync-service';
import type { MetrikaClient } from '../../src/metrika/client';
import { freshDb } from '../db/helpers';

const goalsFixture = {
  goals: [
    { id: 80, name: 'payment', type: 'action' },
    { id: 10, name: 'old', type: 'action' },
  ],
};
const statFixture = {
  data: [{ dimensions: [{ name: 'podcast' }], metrics: [100, 90, 0.2, 65] }],
};

function fakeClient(): MetrikaClient {
  return {
    get: vi.fn(async (path: string) => (path.includes('/goals') ? goalsFixture : statFixture)),
  } as unknown as MetrikaClient;
}

let db: DB;
let metrics: MetricsRepo;
let svc: SyncService;

beforeEach(() => {
  db = freshDb();
  metrics = new MetricsRepo(db);
  svc = new SyncService({
    client: fakeClient(),
    metrics,
    counterId: 54280963,
    archivedThreshold: 77,
    now: () => '2025-01-20T00:00:00.000Z',
  });
});
afterEach(() => db.close());

describe('SyncService.syncGoals', () => {
  it('upserts goals and flags those below the archive threshold', async () => {
    const count = await svc.syncGoals();
    expect(count).toBe(2);
    expect(metrics.listGoals().map((g) => g.id)).toEqual([80]); // 10 is archived (< 77)
    expect(metrics.listGoals(true).map((g) => g.id)).toEqual([10, 80]);
  });
});

describe('SyncService.syncTraffic', () => {
  it('fetches a single chunk for a short range and caches raw + channel stats', async () => {
    const { days, rows } = await svc.syncTraffic('2025-01-01', '2025-01-03');
    expect(days).toBe(1);
    expect(rows).toBe(1);
    expect(metrics.listChannelStats()).toHaveLength(1);
    expect(metrics.listChannelStats()[0]?.date).toBe('2025-01-01');
  });

  it('splits a long range into per-day chunks', async () => {
    const { days, rows } = await svc.syncTraffic('2025-01-01', '2025-01-15');
    expect(days).toBe(15);
    expect(rows).toBe(15);
    expect(metrics.listChannelStats()).toHaveLength(15);
  });
});

describe('SyncService.syncAll', () => {
  it('returns a combined summary', async () => {
    const summary = await svc.syncAll('2025-01-01', '2025-01-07', 80);
    expect(summary).toEqual({ goals: 2, days: 1, channelRows: 1 });
  });
});
