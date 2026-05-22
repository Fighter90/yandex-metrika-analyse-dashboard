import type { FastifyInstance } from 'fastify';
import type { MetricsRepo } from '../db/repositories/metrics-repo';

export interface MetricsRouteOptions {
  readonly repo: MetricsRepo;
}

/** Read-only metrics endpoints backed by the cached SQLite tables. */
export async function metricsRoutes(
  app: FastifyInstance,
  opts: MetricsRouteOptions,
): Promise<void> {
  app.get(
    '/metrics/channels',
    { schema: { tags: ['metrics'], summary: 'Channel stats' } },
    async (req) => {
      const q = req.query as { from?: string; to?: string };
      const range = q.from && q.to ? { from: q.from, to: q.to } : undefined;
      return opts.repo.listChannelStats(range);
    },
  );

  app.get('/metrics/goals', { schema: { tags: ['metrics'], summary: 'Goals' } }, async (req) => {
    const archived = (req.query as { archived?: string }).archived === 'true';
    return opts.repo.listGoals(archived);
  });

  app.get(
    '/metrics/raw/:id',
    { schema: { tags: ['metrics'], summary: 'Raw response' } },
    async (req, reply) => {
      const raw = opts.repo.getRawResponse(Number((req.params as { id: string }).id));
      return raw ?? reply.code(404).send({ error: 'not found' });
    },
  );
}
