import type { ReportSnapshot } from '@pca/shared';
import { reportSections } from '../docx/sections';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ESCAPES[c] as string);
}

/**
 * Deterministic print-ready HTML for a snapshot (same content as the DOCX). Puppeteer renders
 * this to PDF; keeping it a pure function makes the report content fully testable.
 */
export function reportHtml(snapshot: ReportSnapshot): string {
  const sections = reportSections(snapshot)
    .map(
      (sec) =>
        `<section><h1>${esc(sec.heading)}</h1>${sec.lines
          .map((l) => `<p>${esc(l)}</p>`)
          .join('')}</section>`,
    )
    .join('');
  return [
    '<!doctype html>',
    '<html lang="ru"><head><meta charset="utf-8">',
    `<title>ProductCamp report ${esc(snapshot.id)}</title>`,
    '<style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}',
    'h1{font-size:15px;border-bottom:1px solid #cbd5e1;margin-top:18px}',
    'p{font-size:12px;margin:3px 0}header{font-size:11px;color:#64748b}</style>',
    '</head><body>',
    `<header>ProductCamp · Конверсии и лидген · ${esc(snapshot.period.from)} — ${esc(snapshot.period.to)}</header>`,
    sections,
    '</body></html>',
  ].join('');
}
