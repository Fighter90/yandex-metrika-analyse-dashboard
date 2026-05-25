import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { GeneratedHypotheses, ReportSnapshot } from '@pca/shared';

const SnapshotBody = z.object({ from: z.string(), to: z.string() });
const GenerateBody = z.object({ snapshotId: z.string(), format: z.enum(['docx', 'pdf']) });
const InsightsBody = z.object({ snapshotId: z.string() });
const HypothesesBody = z.object({ snapshotId: z.string() });

export type ReportFormat = z.infer<typeof GenerateBody>['format'];

export type InsightsResult =
  | { ok: true; narrative: string }
  | { ok: false; reason: 'not_found' | 'unavailable'; message: string };

export type HypothesesResult =
  | { ok: true; hypotheses: GeneratedHypotheses }
  | { ok: false; reason: 'not_found' | 'unavailable'; message: string };

/** A generated report file ready to stream to the browser as a download. */
export interface ReportDownload {
  readonly body: Buffer;
  readonly filename: string;
  readonly contentType: string;
}

export interface ReportRunner {
  build: (opts: { from: string; to: string }) => ReportSnapshot;
  get: (id: string) => ReportSnapshot | undefined;
  list: () => Array<{ id: string; generatedAt: string; dateFrom: string; dateTo: string }>;
  generate: (snapshotId: string, format: ReportFormat) => Promise<{ filePath: string } | undefined>;
  /** Render a snapshot to DOCX/PDF bytes for download (undefined when the snapshot is missing). */
  download: (snapshotId: string, format: ReportFormat) => Promise<ReportDownload | undefined>;
  /** Generate + persist the AI narrative for a snapshot. */
  insights: (snapshotId: string) => Promise<InsightsResult>;
  /** Generate + persist the AI hypotheses for a snapshot. */
  hypotheses: (snapshotId: string) => Promise<HypothesesResult>;
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

  /** List all report snapshots (for the "History" page). */
  app.get('/report/snapshots', async () => opts.runner.list());

  app.post('/report/generate', async (req, reply) => {
    const parsed = GenerateBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' });
    const result = await opts.runner.generate(parsed.data.snapshotId, parsed.data.format);
    return result ?? reply.code(404).send({ error: 'snapshot not found' });
  });

  app.get('/report/download/:snapshotId/:format', async (req, reply) => {
    const params = z
      .object({ snapshotId: z.string(), format: z.enum(['docx', 'pdf']) })
      .safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid format' });
    const file = await opts.runner.download(params.data.snapshotId, params.data.format);
    if (!file) return reply.code(404).send({ error: 'snapshot not found' });
    return reply
      .header('content-type', file.contentType)
      .header('content-disposition', `attachment; filename="${file.filename}"`)
      .send(file.body);
  });

  app.post('/report/insights', async (req, reply) => {
    const parsed = InsightsBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' });
    const result = await opts.runner.insights(parsed.data.snapshotId);
    if (result.ok) return { narrative: result.narrative };
    return reply.code(result.reason === 'not_found' ? 404 : 503).send({ error: result.message });
  });

  app.post('/report/hypotheses', async (req, reply) => {
    const parsed = HypothesesBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid body' });
    const result = await opts.runner.hypotheses(parsed.data.snapshotId);
    if (result.ok) return { hypotheses: result.hypotheses };
    return reply.code(result.reason === 'not_found' ? 404 : 503).send({ error: result.message });
  });
}
