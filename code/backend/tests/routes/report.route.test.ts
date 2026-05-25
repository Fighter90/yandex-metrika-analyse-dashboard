import { describe, it, expect, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import type { GeneratedHypotheses, ReportSnapshot } from '@pca/shared';
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
    const runner: ReportRunner = {
      build: vi.fn().mockReturnValue(snap),
      get: vi.fn(),
      list: vi.fn().mockReturnValue([]),
      generate: vi.fn(),
      download: vi.fn(),
      insights: vi.fn(),
      hypotheses: vi.fn(),
    };
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
    const app = appWith({
      build: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      generate: vi.fn(),
      download: vi.fn(),
      insights: vi.fn(),
      hypotheses: vi.fn(),
    } as ReportRunner);
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
      list: vi.fn(),
      generate: vi.fn(),
      download: vi.fn(),
      insights: vi.fn(),
      hypotheses: vi.fn(),
    };
    const app = appWith(runner);
    const found = await app.inject({ method: 'GET', url: '/api/report/snapshot/snap-1' });
    expect(found.statusCode).toBe(200);
    const missing = await app.inject({ method: 'GET', url: '/api/report/snapshot/none' });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });

  it('GET /api/report/snapshots lists all snapshots', async () => {
    const summaries = [
      { id: 'snap-1', generatedAt: 'T1', dateFrom: '2025-01-01', dateTo: '2025-01-07' },
      { id: 'snap-2', generatedAt: 'T2', dateFrom: '2025-01-08', dateTo: '2025-01-14' },
    ];
    const runner: ReportRunner = {
      build: vi.fn(),
      get: vi.fn(),
      list: vi.fn().mockReturnValue(summaries),
      generate: vi.fn(),
      download: vi.fn(),
      insights: vi.fn(),
      hypotheses: vi.fn(),
    };
    const app = appWith(runner);
    const res = await app.inject({ method: 'GET', url: '/api/report/snapshots' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(summaries);
    await app.close();
  });

  it('POST /api/report/generate returns a file path, 400 on bad body, 404 on missing snapshot', async () => {
    const runner: ReportRunner = {
      build: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      generate: vi.fn(async (id: string, format: string) =>
        id === 'snap-1' ? { filePath: `data/reports/snap-1.${format}` } : undefined,
      ),
      download: vi.fn(),
      insights: vi.fn(),
      hypotheses: vi.fn(),
    };
    const app = appWith(runner);

    const ok = await app.inject({
      method: 'POST',
      url: '/api/report/generate',
      payload: { snapshotId: 'snap-1', format: 'docx' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().filePath).toBe('data/reports/snap-1.docx');

    const pdf = await app.inject({
      method: 'POST',
      url: '/api/report/generate',
      payload: { snapshotId: 'snap-1', format: 'pdf' },
    });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.json().filePath).toBe('data/reports/snap-1.pdf');

    const bad = await app.inject({
      method: 'POST',
      url: '/api/report/generate',
      payload: { snapshotId: 'snap-1', format: 'xlsx' },
    });
    expect(bad.statusCode).toBe(400);

    const missing = await app.inject({
      method: 'POST',
      url: '/api/report/generate',
      payload: { snapshotId: 'none', format: 'docx' },
    });
    expect(missing.statusCode).toBe(404);
    await app.close();
  });

  it('POST /api/report/insights returns the narrative, 404 / 503 on failure, 400 on bad body', async () => {
    const runner: ReportRunner = {
      build: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      generate: vi.fn(),
      download: vi.fn(),
      insights: vi.fn(async (id: string) => {
        if (id === 'ok') return { ok: true as const, narrative: 'анализ' };
        if (id === 'missing')
          return { ok: false as const, reason: 'not_found' as const, message: 'not found' };
        return { ok: false as const, reason: 'unavailable' as const, message: 'no key' };
      }),
      hypotheses: vi.fn(),
    };
    const app = appWith(runner);

    const ok = await app.inject({
      method: 'POST',
      url: '/api/report/insights',
      payload: { snapshotId: 'ok' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().narrative).toBe('анализ');

    const missing = await app.inject({
      method: 'POST',
      url: '/api/report/insights',
      payload: { snapshotId: 'missing' },
    });
    expect(missing.statusCode).toBe(404);

    const unavailable = await app.inject({
      method: 'POST',
      url: '/api/report/insights',
      payload: { snapshotId: 'nokey' },
    });
    expect(unavailable.statusCode).toBe(503);

    const bad = await app.inject({ method: 'POST', url: '/api/report/insights', payload: {} });
    expect(bad.statusCode).toBe(400);
    await app.close();
  });

  it('POST /api/report/hypotheses returns the hypotheses, 404 / 503 on failure, 400 on bad body', async () => {
    const fakeHypotheses: GeneratedHypotheses = { problems: [], solutions: [] };
    const runner: ReportRunner = {
      build: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      generate: vi.fn(),
      download: vi.fn(),
      insights: vi.fn(),
      hypotheses: vi.fn(async (id: string) => {
        if (id === 'ok') return { ok: true as const, hypotheses: fakeHypotheses };
        if (id === 'missing')
          return { ok: false as const, reason: 'not_found' as const, message: 'not found' };
        return { ok: false as const, reason: 'unavailable' as const, message: 'no key' };
      }),
    };
    const app = appWith(runner);

    const ok = await app.inject({
      method: 'POST',
      url: '/api/report/hypotheses',
      payload: { snapshotId: 'ok' },
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toEqual({ hypotheses: fakeHypotheses });

    const missing = await app.inject({
      method: 'POST',
      url: '/api/report/hypotheses',
      payload: { snapshotId: 'missing' },
    });
    expect(missing.statusCode).toBe(404);

    const unavailable = await app.inject({
      method: 'POST',
      url: '/api/report/hypotheses',
      payload: { snapshotId: 'nokey' },
    });
    expect(unavailable.statusCode).toBe(503);

    const bad = await app.inject({ method: 'POST', url: '/api/report/hypotheses', payload: {} });
    expect(bad.statusCode).toBe(400);
    await app.close();
  });

  it('GET /api/report/download streams bytes with attachment headers, 404 / 400 otherwise', async () => {
    const runner: ReportRunner = {
      build: vi.fn(),
      get: vi.fn(),
      list: vi.fn(),
      generate: vi.fn(),
      download: vi.fn(async (id: string, format: 'docx' | 'pdf') =>
        id === 'snap-1'
          ? {
              body: Buffer.from('FILE-BYTES'),
              filename: `productcamp-report-snap-1.${format}`,
              contentType: format === 'pdf' ? 'application/pdf' : 'application/octet-stream',
            }
          : undefined,
      ),
      insights: vi.fn(),
      hypotheses: vi.fn(),
    };
    const app = appWith(runner);

    const ok = await app.inject({ method: 'GET', url: '/api/report/download/snap-1/docx' });
    expect(ok.statusCode).toBe(200);
    expect(ok.headers['content-disposition']).toContain('attachment');
    expect(ok.headers['content-disposition']).toContain('productcamp-report-snap-1.docx');
    expect(ok.body).toBe('FILE-BYTES');

    const missing = await app.inject({ method: 'GET', url: '/api/report/download/none/pdf' });
    expect(missing.statusCode).toBe(404);

    const bad = await app.inject({ method: 'GET', url: '/api/report/download/snap-1/xlsx' });
    expect(bad.statusCode).toBe(400);
    await app.close();
  });
});
