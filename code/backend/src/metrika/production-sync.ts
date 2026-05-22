import { config, hasCounterId } from '../config';
import { openDb } from '../db/connection';
import { migrate } from '../db/migrate';
import { MetricsRepo } from '../db/repositories/metrics-repo';
import { MetrikaClient } from './client';
import { SyncService } from './sync-service';
import type { SyncRunner } from '../routes/sync';

/**
 * Production sync runner: lazily opens the SQLite DB and builds a token-backed Metrika client
 * on first use. Excluded from coverage — IO bootstrap requiring a real token + database.
 */
export function makeSyncRunner(): SyncRunner {
  let svc: SyncService | undefined;
  return async (body) => {
    if (!hasCounterId()) {
      throw new Error(
        'COUNTER_ID is not set — add your Yandex Metrika counter id to .env (./init.sh).',
      );
    }
    if (!svc) {
      const db = openDb(config.DB_PATH);
      migrate(db);
      svc = new SyncService({
        client: new MetrikaClient({ token: config.YANDEX_OAUTH_TOKEN }),
        metrics: new MetricsRepo(db),
        counterId: config.COUNTER_ID,
        archivedThreshold: config.ARCHIVED_GOAL_ID_THRESHOLD,
        now: () => new Date().toISOString(),
      });
    }
    return svc.syncAll(body.from, body.to, body.goalId);
  };
}
