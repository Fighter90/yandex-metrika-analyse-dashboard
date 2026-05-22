import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SyncSummary } from '../metrika/sync-service';

const SyncBody = z.object({
  from: z.string(),
  to: z.string(),
  goalId: z.number().int().optional(),
});

export type SyncRunner = (body: z.infer<typeof SyncBody>) => Promise<SyncSummary>;

export interface SyncRouteOptions {
  readonly runSync: SyncRunner;
}

/** `POST /api/sync` — pull Metrika data into SQLite for the given period. */
export async function syncRoutes(app: FastifyInstance, opts: SyncRouteOptions): Promise<void> {
  app.post('/sync', async (req, reply) => {
    const parsed = SyncBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid body', issues: parsed.error.issues });
    }
    return reply.code(200).send(await opts.runSync(parsed.data));
  });
}
