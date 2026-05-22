import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ReportSnapshot } from '@pca/shared';
import type { SnapshotBuilder } from './snapshot-builder';
import type { SnapshotRepo } from '../db/repositories/snapshot-repo';
import type { ReportRunner } from '../routes/report';
import { buildDocx } from './docx/builder';

const REPORTS_DIR = 'data/reports';

/**
 * Production report runner: builds + persists snapshots and writes DOCX files to data/reports.
 * Excluded from coverage — IO + non-deterministic id/clock (SnapshotBuilder and buildDocx are tested).
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
    generate: async (snapshotId) => {
      const record = snapshots.getById(snapshotId);
      if (!record) return undefined;
      const buf = await buildDocx(record.payload as ReportSnapshot);
      mkdirSync(REPORTS_DIR, { recursive: true });
      const filePath = join(REPORTS_DIR, `${snapshotId}.docx`);
      writeFileSync(filePath, buf);
      return { filePath };
    },
  };
}
