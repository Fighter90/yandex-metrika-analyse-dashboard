import type { ReportSnapshot } from '@pca/shared';
import { reportSections } from '../docx/sections';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ESCAPES[c] as string);
}

/**
 * Deterministic print-ready HTML for a snapshot (same content as the DOCX), formatted to a
 * ГОСТ-style document: A4 with ГОСТ margins (left 30mm), Times New Roman 14pt / 1.5 line spacing,
 * a centered title page, a table of contents («Содержание»), and numbered sections. Puppeteer
 * renders this to PDF; keeping it a pure function makes the report content fully testable.
 */
export function reportHtml(snapshot: ReportSnapshot): string {
  const all = reportSections(snapshot);
  // The first section is the title page; the rest are numbered 1..N and listed in the TOC.
  const toc = all
    .slice(1)
    .map((s, j) => `<li>${j + 1}. ${esc(s.heading)}</li>`)
    .join('');
  const body = all
    .map((sec, i) => {
      const lines = sec.lines
        .map((l) => (l === '' ? '<p class="sp"></p>' : `<p>${esc(l)}</p>`))
        .join('');
      if (i === 0) {
        return (
          `<section class="cover"><h1>${esc(sec.heading)}</h1>${lines}` +
          `<p class="sub">Период: ${esc(snapshot.period.from)} — ${esc(snapshot.period.to)}</p></section>` +
          `<section class="toc"><h2>Содержание</h2><ol>${toc}</ol></section>`
        );
      }
      return `<section class="brk"><h1>${i}. ${esc(sec.heading)}</h1>${lines}</section>`;
    })
    .join('');
  return [
    '<!doctype html>',
    '<html lang="ru"><head><meta charset="utf-8">',
    `<title>ProductCamp report ${esc(snapshot.id)}</title>`,
    '<style>',
    '@page{size:A4;margin:20mm 15mm 20mm 30mm}',
    "body{font-family:'Times New Roman',Times,serif;font-size:14pt;line-height:1.5;color:#000;text-align:justify}",
    '.cover{text-align:center;page-break-after:always;padding-top:60mm}',
    '.cover h1{font-size:20pt;border:0;margin-bottom:10mm}.cover .sub{font-size:14pt;margin:4mm 0}',
    '.toc{page-break-after:always}.toc h2{text-align:center;font-size:14pt}',
    '.toc ol{list-style:none;padding:0}.toc li{margin:2mm 0}',
    'h1{font-size:14pt;font-weight:bold;margin:0 0 4mm}',
    'section.brk{page-break-before:always}p.sp{height:6pt;margin:0}',
    'p{margin:0;white-space:pre-wrap}',
    '</style></head><body>',
    body,
    '</body></html>',
  ].join('');
}
