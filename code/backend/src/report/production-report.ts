import { randomUUID } from 'node:crypto';
import type { ReportSnapshot } from '@pca/shared';
import type { SnapshotBuilder } from './snapshot-builder';
import type { SnapshotRepo } from '../db/repositories/snapshot-repo';
import type { ReportRunner } from '../routes/report';

/**
 * Production report runner: generates id + timestamp, builds the snapshot and persists it.
 * Excluded from coverage — IO + non-deterministic id/clock (SnapshotBuilder itself is tested).
 */
export function makeReportRunner(builder: SnapshotBuilder, snapshots: SnapshotRepo): ReportRunner {
  return {
    build: ({ from, to }) => {
      const id = randomUUID();
      const generatedAt = new Date().toISOString();
      const snapshot = builder.build({ id, generatedAt, from, to });
      snapshots.save({ id, generatedAt, dateFrom: from, dateTo: to, payload: snapshot });
      return snapshot;
    },
    get: (id) => snapshots.getById(id)?.payload as ReportSnapshot | undefined,
  };
}
