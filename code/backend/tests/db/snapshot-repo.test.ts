import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DB } from '../../src/db/connection';
import { SnapshotRepo } from '../../src/db/repositories/snapshot-repo';
import { freshDb } from './helpers';

let db: DB;
let repo: SnapshotRepo;

beforeEach(() => {
  db = freshDb();
  repo = new SnapshotRepo(db);
});
afterEach(() => db.close());

describe('SnapshotRepo', () => {
  it('saves and reads a snapshot with file paths', () => {
    repo.save({
      id: '01ABC',
      generatedAt: '2025-01-10T00:00:00.000Z',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-07',
      payload: { kpi: { total: 160 } },
      docxPath: 'data/reports/r.docx',
      pdfPath: 'data/reports/r.pdf',
    });
    const got = repo.getById('01ABC');
    expect(got?.payload).toEqual({ kpi: { total: 160 } });
    expect(got?.docxPath).toBe('data/reports/r.docx');
    expect(got?.pdfPath).toBe('data/reports/r.pdf');
  });

  it('saves a snapshot without file paths (optional → undefined) and lists snapshots', () => {
    repo.save({
      id: '01XYZ',
      generatedAt: '2025-01-11T00:00:00.000Z',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-07',
      payload: { ok: true },
    });
    const got = repo.getById('01XYZ');
    expect(got?.docxPath).toBeUndefined();
    expect(got?.pdfPath).toBeUndefined();
    expect(repo.list().length).toBeGreaterThanOrEqual(1);
  });

  it('returns undefined for a missing snapshot', () => {
    expect(repo.getById('nope')).toBeUndefined();
  });
});
