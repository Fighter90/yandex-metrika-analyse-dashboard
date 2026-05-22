import { buildServer } from './app';
import { config } from './config';
import { openDb } from './db/connection';
import { migrate } from './db/migrate';
import { MetricsRepo } from './db/repositories/metrics-repo';
import { HypothesesRepo } from './db/repositories/hypotheses-repo';
import { DecisionsRepo } from './db/repositories/decisions-repo';
import { B2bRepo } from './db/repositories/b2b-repo';
import { SnapshotRepo } from './db/repositories/snapshot-repo';
import { SnapshotBuilder } from './report/snapshot-builder';
import { makeSyncRunner } from './metrika/production-sync';
import { makeReportRunner } from './report/production-report';

/** Entry point. Excluded from coverage — opens the real DB and binds the port. */
async function main(): Promise<void> {
  const db = openDb(config.DB_PATH);
  migrate(db);
  const metrics = new MetricsRepo(db);
  const hypotheses = new HypothesesRepo(db);
  const decisions = new DecisionsRepo(db);
  const b2b = new B2bRepo(db);
  const builder = new SnapshotBuilder({ metrics, hypotheses, decisions, b2b });
  const app = buildServer(
    {
      metrics,
      hypotheses,
      decisions,
      b2b,
      runSync: makeSyncRunner(),
      report: makeReportRunner(builder, new SnapshotRepo(db)),
    },
    true,
  );
  try {
    await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
