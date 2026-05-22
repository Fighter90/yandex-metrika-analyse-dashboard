import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { NewHypothesis } from '@pca/shared';
import { HypothesesRepo, HypothesisValidationError } from '../db/repositories/hypotheses-repo';

export interface HypothesesRouteOptions {
  readonly repo: HypothesesRepo;
}

const StatusBody = z.object({
  status: z.enum(['draft', 'in_progress', 'green', 'yellow', 'red', 'expired']),
});

/** Hypotheses CRUD. Creation enforces the Voronkova format (invalid → 422). */
export async function hypothesesRoutes(
  app: FastifyInstance,
  opts: HypothesesRouteOptions,
): Promise<void> {
  app.get('/hypotheses', { schema: { tags: ['hypotheses'] } }, async () => opts.repo.list());

  app.get('/hypotheses/:id', { schema: { tags: ['hypotheses'] } }, async (req, reply) => {
    const h = opts.repo.getById(Number((req.params as { id: string }).id));
    return h ?? reply.code(404).send({ error: 'not found' });
  });

  app.post('/hypotheses', { schema: { tags: ['hypotheses'] } }, async (req, reply) => {
    try {
      return reply.code(201).send(opts.repo.create(req.body as NewHypothesis));
    } catch (err) {
      if (err instanceof HypothesisValidationError) {
        return reply.code(422).send({ error: 'invalid hypothesis', issues: err.errors });
      }
      throw err;
    }
  });

  app.patch('/hypotheses/:id/status', { schema: { tags: ['hypotheses'] } }, async (req, reply) => {
    const parsed = StatusBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid status' });
    const updated = opts.repo.updateStatus(
      Number((req.params as { id: string }).id),
      parsed.data.status,
    );
    return updated ?? reply.code(404).send({ error: 'not found' });
  });
}
