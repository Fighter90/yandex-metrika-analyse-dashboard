import type { DB } from '../connection';

export interface ReportSnapshotRecord {
  readonly id: string;
  readonly generatedAt: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly payload: unknown;
  readonly docxPath?: string;
  readonly pdfPath?: string;
}

interface SnapshotRow {
  id: string;
  generated_at: string;
  date_from: string;
  date_to: string;
  payload: string;
  docx_path: string | null;
  pdf_path: string | null;
}

function toRecord(r: SnapshotRow): ReportSnapshotRecord {
  return {
    id: r.id,
    generatedAt: r.generated_at,
    dateFrom: r.date_from,
    dateTo: r.date_to,
    payload: JSON.parse(r.payload),
    docxPath: r.docx_path ?? undefined,
    pdfPath: r.pdf_path ?? undefined,
  };
}

/** Stores immutable report snapshots (id supplied by caller — a ULID from Iteration 8). */
export class SnapshotRepo {
  constructor(private readonly db: DB) {}

  save(record: ReportSnapshotRecord): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO report_snapshots
           (id, generated_at, date_from, date_to, payload, docx_path, pdf_path)
         VALUES (@id, @generated_at, @date_from, @date_to, @payload, @docx_path, @pdf_path)`,
      )
      .run({
        id: record.id,
        generated_at: record.generatedAt,
        date_from: record.dateFrom,
        date_to: record.dateTo,
        payload: JSON.stringify(record.payload),
        docx_path: record.docxPath ?? null,
        pdf_path: record.pdfPath ?? null,
      });
  }

  getById(id: string): ReportSnapshotRecord | undefined {
    const r = this.db.prepare('SELECT * FROM report_snapshots WHERE id = ?').get(id) as
      | SnapshotRow
      | undefined;
    return r ? toRecord(r) : undefined;
  }

  list(): ReportSnapshotRecord[] {
    return (
      this.db
        .prepare('SELECT * FROM report_snapshots ORDER BY generated_at DESC')
        .all() as SnapshotRow[]
    ).map(toRecord);
  }
}
