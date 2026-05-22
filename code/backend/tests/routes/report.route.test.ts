import { describe, it, expect, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { ReportSnapshot } from '@pca/shared';
import { reportRoutes, type ReportRunner } from '../../src/routes/report';

const snap = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: { problems: [], solutions: [] },
  decisions: [],
} as unknown as ReportSnapshot;

function appWith(runner: ReportRunner): FastifyInstance {
  const app = Fastify();
  app.register(reportRoutes, { prefix: '/api', runner });
  return app;
}

describe('report routes', () => {
  it('POST /api/report/snapshot builds and returns a snapshot', async () => {
    const runner: ReportRunner = { build: vi.fn().mockReturnValue(snap), get: vi.fn() };
    const app = appWith(runner);
    const res = await app.inject({
      method: 'POST',
      url: '/api/report/snapshot',
      payload: { from: '2025-01-01', to: '2025-01-07' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().id).toBe('snap-1');
    expect(runner.build).toHaveBeenCalledWith({ from: '2025-01-01', to: '2025-01-07' });
    await app.close();
  });

  it('POST rejects an invalid body with 400', async () => {
    const app = appWith({ build: vi.fn(), get: vi.fn() } as unknown as ReportRunner);
    const res = await app.inject({
      method: 'POST',
      url: '/api/report/snapshot',
      payload: { from: 1 },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('GET /api/report/snapshot/:id returns the snapshot or 404', async () => {
    const runner: ReportRunner = {
      build: vi.fn(),
      get: vi.fn((id: string) => (id === 'snap-1' ? snap : undefined)),
    };
    const app = appWith(runner);
    const found = await app.inject({ method: 'GET', url: '/api/report/snapshot/snap-1' });
    expect(found.statusCode).toBe(200);
    const missing = await app.inject({ method: 'GET', url: '/api/report/snapshot/none' });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });
});
