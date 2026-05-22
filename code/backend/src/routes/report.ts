import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ReportSnapshot } from '@pca/shared';

const SnapshotBody = z.object({ from: z.string(), to: z.string() });
const GenerateBody = z.object({ snapshotId: z.string(), format: z.enum(['docx', 'pdf']) });
const InsightsBody = z.object({ snapshotId: z.string() });

export type ReportFormat = z.infer<typeof GenerateBody>['format'];

export type InsightsResult =
  | { ok: true; narrative: string }
  | { ok: false; reason: 'not_found' | 'unavailable'; message: string };

export interface ReportRunner {
  build: (opts: { from: string; to: string }) => ReportSnapshot;
  get: (id: string) => ReportSnapshot | undefined;
  generate: (snapshotId: string, format: ReportFormat) => Promise<{ filePath: string } | undefined>;
  /** Generate + persist the AI narrative for a snapshot. */
  insights: (snapshotId: string) => Promise<InsightsResult>;
}

export interface ReportRouteOptions {
  readonly runner: ReportRunner;
}

/** Build/fetch immutable report snapshots and generate report files. */
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

  app.post('/report/generate', async (req, reply) => {
    const parsed = GenerateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' });
    const result = await opts.runner.generate(parsed.data.snapshotId, parsed.data.format);
    return result ?? reply.code(404).send({ error: 'snapshot not found' });
  });

  app.post('/report/insights', async (req, reply) => {
    const parsed = InsightsBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' });
    const result = await opts.runner.insights(parsed.data.snapshotId);
    if (result.ok) return { narrative: result.narrative };
    return reply.code(result.reason === 'not_found' ? 404 : 503).send({ error: result.message });
  });
}
