import type { FastifyInstance } from 'fastify';
import type { NewDecision } from '@pca/shared';
import { DecisionsRepo, DecisionValidationError } from '../db/repositories/decisions-repo';

export interface DecisionsRouteOptions {
  readonly repo: DecisionsRepo;
}

/** Decision Log endpoints. Creating a decision auto-updates the linked hypothesis status. */
export async function decisionsRoutes(
  app: FastifyInstance,
  opts: DecisionsRouteOptions,
): Promise<void> {
  app.get('/decisions', { schema: { tags: ['decisions'] } }, async () => opts.repo.list());

  app.get('/decisions/:id', { schema: { tags: ['decisions'] } }, async (req, reply) => {
    const d = opts.repo.getById(Number((req.params as { id: string }).id));
    return d ?? reply.code(404).send({ error: 'not found' });
  });

  app.post('/decisions', { schema: { tags: ['decisions'] } }, async (req, reply) => {
    try {
      return reply.code(201).send(opts.repo.create(req.body as NewDecision));
    } catch (err) {
      if (err instanceof DecisionValidationError) {
        return reply.code(422).send({ error: 'invalid decision', message: err.message });
      }
      throw err;
    }
  });
}
