import { describe, it, expect, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { syncRoutes, type SyncRunner } from '../../src/routes/sync';

function appWith(runSync: SyncRunner): FastifyInstance {
  const app = Fastify();
  app.register(syncRoutes, { prefix: '/api', runSync });
  return app;
}

describe('POST /api/sync', () => {
  it('runs the sync and returns the summary', async () => {
    const runSync = vi.fn().mockResolvedValue({ goals: 2, days: 1, channelRows: 1 });
    const app = appWith(runSync as unknown as SyncRunner);
    const res = await app.inject({
      method: 'POST',
      url: '/api/sync',
      payload: { from: '2025-01-01', to: '2025-01-07', goalId: 80 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ goals: 2, days: 1, channelRows: 1 });
    expect(runSync).toHaveBeenCalledWith({ from: '2025-01-01', to: '2025-01-07', goalId: 80 });
    await app.close();
  });

  it('rejects an invalid body with 400', async () => {
    const app = appWith(vi.fn() as unknown as SyncRunner);
    const res = await app.inject({ method: 'POST', url: '/api/sync', payload: { from: 123 } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('invalid body');
    await app.close();
  });
});
