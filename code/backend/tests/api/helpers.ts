import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import type { ReportSnapshot } from '@pca/shared';
import { buildServer, type AppDeps } from '../../src/app';
import type { DB } from '../../src/db/connection';
import { MetricsRepo } from '../../src/db/repositories/metrics-repo';
import { HypothesesRepo } from '../../src/db/repositories/hypotheses-repo';
import { DecisionsRepo } from '../../src/db/repositories/decisions-repo';
import { B2bRepo } from '../../src/db/repositories/b2b-repo';
import { SnapshotRepo } from '../../src/db/repositories/snapshot-repo';
import { SnapshotBuilder } from '../../src/report/snapshot-builder';
import type { ReportRunner } from '../../src/routes/report';
import { freshDb } from '../db/helpers';

export interface TestApp {
  readonly app: FastifyInstance;
  readonly db: DB;
  readonly deps: AppDeps;
}

/** Assemble the full app over an in-memory DB. Pass a logger to exercise that arg explicitly. */
export function buildTestApp(logger?: FastifyServerOptions['logger']): TestApp {
  const db = freshDb();
  const metrics = new MetricsRepo(db);
  const hypotheses = new HypothesesRepo(db);
  const decisions = new DecisionsRepo(db);
  const b2b = new B2bRepo(db);
  const builder = new SnapshotBuilder({ metrics, hypotheses, decisions, b2b });
  const snapshots = new SnapshotRepo(db);
  const report: ReportRunner = {
    build: ({ from, to }) => {
      const s = builder.build({ id: 'test-snapshot', generatedAt: 'test', from, to });
      snapshots.save({
        id: s.id,
        generatedAt: s.generatedAt,
        dateFrom: from,
        dateTo: to,
        payload: s,
      });
      return s;
    },
    get: (id) => snapshots.getById(id)?.payload as ReportSnapshot | undefined,
  };
  const deps: AppDeps = {
    metrics,
    hypotheses,
    decisions,
    b2b,
    runSync: async () => ({ goals: 0, days: 0, channelRows: 0 }),
    report,
  };
  const app = logger === undefined ? buildServer(deps) : buildServer(deps, logger);
  return { app, db, deps };
}
