import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ReportSnapshot } from '@pca/shared';

const SnapshotBody = z.object({ from: z.string(), to: z.string() });

export interface ReportRunner {
  build: (opts: { from: string; to: string }) => ReportSnapshot;
  get: (id: string) => ReportSnapshot | undefined;
}

export interface ReportRouteOptions {
  readonly runner: ReportRunner;
}

/** Build/fetch immutable report snapshots. */
export async function reportRoutes(app: FastifyInstance, opts: ReportRouteOptions): Promise<void> {
  app.post('/report/snapshot', async (req, reply) => {
    const parsed = SnapshotBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' });
    return reply.code(201).send(opts.runner.build(parsed.data));
  });

  app.get('/report/snapshot/:id', async (req, reply) => {
    const snap = opts.runner.get((req.params as { id: string }).id);
    return snap ?? reply.code(404).send({ error: 'not found' });
  });
}
