import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ReportSnapshot } from '@pca/shared';
import type { SnapshotBuilder } from './snapshot-builder';
import type { SnapshotRepo } from '../db/repositories/snapshot-repo';
import type { ReportRunner } from '../routes/report';
import { buildDocx } from './docx/builder';
import { buildPdf } from './pdf/renderer';
import { renderReportCharts } from './chart-renderer';
import { generateInsights, type AnthropicFetch } from './ai-insights';
import { generateHypotheses } from './ai-hypotheses';
import { generateDecisions } from './ai-decisions';
import { config, hasAnthropicKey } from '../config';

const REPORTS_DIR = 'data/reports';

/**
 * Production report runner: builds + persists snapshots and writes DOCX/PDF files to data/reports.
 * Excluded from coverage — IO + non-deterministic id/clock (SnapshotBuilder, buildDocx and reportHtml
 * are tested; buildPdf launches a real browser and is also coverage-excluded).
 *
 * Auto-generates AI hypotheses during build (if ANTHROPIC_API_KEY is set).
 */
export function makeReportRunner(builder: SnapshotBuilder, snapshots: SnapshotRepo): ReportRunner {
  return {
    build: async ({ from, to }) => {
      const id = randomUUID();
      const generatedAt = new Date().toISOString();
      const snapshot = builder.build({ id, generatedAt, from, to });
      snapshots.save({
        id,
        generatedAt,
        dateFrom: from,
        dateTo: to,
        payload: snapshot,
      });

      // Fire-and-forget AI hypotheses generation (doesn't block the response)
      if (hasAnthropicKey()) {
        generateHypotheses(snapshot, {
          fetch: globalThis.fetch as unknown as AnthropicFetch,
          apiKey: config.ANTHROPIC_API_KEY,
          model: config.ANTHROPIC_MODEL,
        })
          .then(async (generatedHypotheses) => {
            // Also propose Decision Log entries from the snapshot + hypotheses (best-effort).
            const generatedDecisions = await generateDecisions(snapshot, generatedHypotheses, {
              fetch: globalThis.fetch as unknown as AnthropicFetch,
              apiKey: config.ANTHROPIC_API_KEY,
              model: config.ANTHROPIC_MODEL,
            }).catch(() => undefined);
            snapshots.save({
              id,
              generatedAt,
              dateFrom: from,
              dateTo: to,
              payload: { ...snapshot, generatedHypotheses, generatedDecisions },
              docxPath: undefined,
              pdfPath: undefined,
            });
          })
          .catch(() => {
            // Hypotheses generation failed — user can retry via POST /api/report/hypotheses
          });
      }

      return snapshot;
    },
    get: (id) => snapshots.getById(id)?.payload as ReportSnapshot | undefined,
    list: () =>
      snapshots.list().map((r) => ({
        id: r.id,
        generatedAt: r.generatedAt,
        dateFrom: r.dateFrom,
        dateTo: r.dateTo,
      })),
    generate: async (snapshotId, format) => {
      const record = snapshots.getById(snapshotId);
      if (!record) return undefined;
      const stored = record.payload as ReportSnapshot;
      // Render charts once from the immutable snapshot so DOCX and PDF embed identical PNGs (§6.4).
      const snapshot: ReportSnapshot = { ...stored, charts: await renderReportCharts(stored) };
      const buf = format === 'pdf' ? await buildPdf(snapshot) : await buildDocx(snapshot);
      mkdirSync(REPORTS_DIR, { recursive: true });
      const filePath = join(REPORTS_DIR, `${snapshotId}.${format}`);
      writeFileSync(filePath, buf);
      return { filePath };
    },
    download: async (snapshotId, format) => {
      const record = snapshots.getById(snapshotId);
      if (!record) return undefined;
      const stored = record.payload as ReportSnapshot;
      const snapshot: ReportSnapshot = { ...stored, charts: await renderReportCharts(stored) };
      const body = format === 'pdf' ? await buildPdf(snapshot) : await buildDocx(snapshot);
      const contentType =
        format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      return { body, filename: `productcamp-report-${snapshotId}.${format}`, contentType };
    },
    insights: async (snapshotId) => {
      const record = snapshots.getById(snapshotId);
      if (!record) return { ok: false, reason: 'not_found', message: 'snapshot not found' };
      if (!hasAnthropicKey()) {
        return {
          ok: false,
          reason: 'unavailable',
          message: 'ANTHROPIC_API_KEY не задан — запустите ./init.sh или впишите ключ в .env',
        };
      }
      const snapshot = record.payload as ReportSnapshot;
      const narrative = await generateInsights(globalThis.fetch as unknown as AnthropicFetch, {
        apiKey: config.ANTHROPIC_API_KEY,
        model: config.ANTHROPIC_MODEL,
        snapshot,
      });
      // Persist the narrative onto the snapshot so DOCX/PDF render it (deterministically) later.
      snapshots.save({
        id: record.id,
        generatedAt: record.generatedAt,
        dateFrom: record.dateFrom,
        dateTo: record.dateTo,
        payload: { ...snapshot, aiNarrative: narrative },
        docxPath: record.docxPath,
        pdfPath: record.pdfPath,
      });
      return { ok: true, narrative };
    },
    hypotheses: async (snapshotId) => {
      const record = snapshots.getById(snapshotId);
      if (!record) return { ok: false, reason: 'not_found', message: 'snapshot not found' };
      // If hypotheses were already generated during build, return them
      const existing = record.payload as ReportSnapshot;
      if (existing.generatedHypotheses) {
        return { ok: true, hypotheses: existing.generatedHypotheses };
      }
      if (!hasAnthropicKey()) {
        return {
          ok: false,
          reason: 'unavailable',
          message: 'ANTHROPIC_API_KEY не задан — запустите ./init.sh или впишите ключ в .env',
        };
      }
      const snapshot = record.payload as ReportSnapshot;
      const generatedHypotheses = await generateHypotheses(snapshot, {
        fetch: globalThis.fetch as unknown as AnthropicFetch,
        apiKey: config.ANTHROPIC_API_KEY,
        model: config.ANTHROPIC_MODEL,
      });
      // Propose Decision Log entries from the snapshot + hypotheses (best-effort — don't fail the
      // hypotheses response if decisions generation rejects).
      const generatedDecisions = await generateDecisions(snapshot, generatedHypotheses, {
        fetch: globalThis.fetch as unknown as AnthropicFetch,
        apiKey: config.ANTHROPIC_API_KEY,
        model: config.ANTHROPIC_MODEL,
      }).catch(() => undefined);
      // Persist hypotheses + decisions onto the snapshot so DOCX/PDF render them deterministically.
      snapshots.save({
        id: record.id,
        generatedAt: record.generatedAt,
        dateFrom: record.dateFrom,
        dateTo: record.dateTo,
        payload: { ...snapshot, generatedHypotheses, generatedDecisions },
        docxPath: record.docxPath,
        pdfPath: record.pdfPath,
      });
      return { ok: true, hypotheses: generatedHypotheses };
    },
  };
}
