import type { ReportSnapshot } from '@pca/shared';
import { reportSections } from '../docx/sections';

/** Parse inline markdown to HTML: **bold**, *italic*, `code`. */
function inlineToHtml(text: string): string {
  // Escape FIRST, then apply markdown → real tags. Escaping after would also escape the `<strong>`
  // we insert, leaking literal «<strong>…</strong>» into the PDF (the tag-leak bug). AI lines already
  // had their raw HTML converted to markdown by sanitizeAiLine, so by here only `**`/`*`/`` ` `` remain.
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** Detect if a line is a table row (starts and ends with |). */
function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|') && line.split('|').length > 2;
}

/** Render a markdown table to HTML. */
function renderTable(lines: string[], startIdx: number): { html: string; consumed: number } | null {
  const tableLines: string[] = [];
  let i = startIdx;

  while (i < lines.length && isTableRow(lines[i]!)) {
    tableLines.push(lines[i]!);
    i++;
  }

  if (tableLines.length < 2) return null;

  const headerCells = tableLines[0]!.split('|').filter((c) => c.trim() !== '');
  const dataRows = tableLines
    .slice(1)
    .filter((r) => !r.startsWith('|---') && !r.startsWith('| ***'))
    .map((r) => r.split('|').filter((c) => c.trim() !== ''));

  let html = '<table><thead><tr>';
  headerCells.forEach((cell) => {
    html += `<th>${inlineToHtml(cell.trim())}</th>`;
  });
  html += '</tr></thead><tbody>';
  dataRows.forEach((cells) => {
    html += '<tr>';
    cells.forEach((cell) => {
      html += `<td>${inlineToHtml(cell.trim())}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  return { html, consumed: tableLines.length };
}

/**
 * Deterministic print-ready HTML for a snapshot (same content as the DOCX), formatted to a
 * ГОСТ-style document: A4 with ГОСТ margins (left 30mm), Times New Roman 14pt / 1.5 line spacing,
 * a centered title page, a table of contents («Содержание»), and numbered sections. Puppeteer
 * renders this to PDF; keeping it a pure function makes the report content fully testable.
 *
 * Supports markdown tables, **bold**, *italic*, and `code` inline formatting.
 */
export function reportHtml(snapshot: ReportSnapshot): string {
  const all = reportSections(snapshot);
  const body = all.slice(1); // section 0 is replaced by a proper GOST title page
  const year = /^\d{4}/.test(snapshot.generatedAt)
    ? snapshot.generatedAt.slice(0, 4)
    : snapshot.period.from.slice(0, 4);
  const toc = body.map((s, j) => `<li>${j + 1}. ${escapeHtml(s.heading)}</li>`).join('');

  // ГОСТ Р 7.32-2017 title page: org on top, work title centred, snapshot id + year below.
  const cover =
    `<section class="cover">` +
    `<div class="cover-org">ProductCamp<br><span class="cover-track">Трек «Конверсии и лидген»</span></div>` +
    `<div class="cover-title">Аналитический отчёт по конверсиям и лидгену</div>` +
    `<div class="cover-sub">за период ${escapeHtml(snapshot.period.from)} — ${escapeHtml(snapshot.period.to)}</div>` +
    `<div class="cover-meta">` +
    `Идентификатор среза данных: ${escapeHtml(snapshot.id)}<br>` +
    `Сформирован: ${escapeHtml(snapshot.generatedAt)}<br>` +
    `Цель: ${snapshot.kpi.target} оплаченных билетов<br>${escapeHtml(year)}` +
    `</div></section>` +
    `<section class="toc"><h2>Содержание</h2><ol>${toc}</ol></section>`;

  let sectionsHtml = '';
  body.forEach((sec, j) => {
    const heading = `${j + 1}. ${escapeHtml(sec.heading)}`;
    const lines = sec.lines;
    // Embed the section's chart PNG (FINAL §6.4), if rendered into the snapshot.
    const chartBase64 = sec.chartId ? snapshot.charts?.[sec.chartId] : undefined;
    let content = chartBase64
      ? `<p class="chart"><img alt="${escapeHtml(sec.heading)}" src="data:image/png;base64,${chartBase64}"></p>`
      : '';
    let lineIdx = 0;

    while (lineIdx < lines.length) {
      const line = lines[lineIdx]!;

      // Try to parse a table
      if (isTableRow(line)) {
        const result = renderTable(lines, lineIdx);
        if (result) {
          content += result.html;
          lineIdx += result.consumed;
          continue;
        }
      }

      // Detect list items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        content += `<li>${inlineToHtml(line.slice(2))}</li>`;
        lineIdx++;
      } else if (line === '') {
        content += '<p class="sp"></p>';
        lineIdx++;
      } else {
        content += `<p>${inlineToHtml(line)}</p>`;
        lineIdx++;
      }
    }

    // Wrap list items in <ul>
    // The regex only captures <li>…</li> so match always starts with <li>, never <ul>.
    // The else branch is structurally unreachable; the guard is a defensive no-op.
    content = content.replace(
      /(<li>.*?<\/li>)/gs,
      /* c8 ignore next */ (match) => {
        /* c8 ignore next 2 */
        if (!match.startsWith('<ul>')) return `<ul>${match}</ul>`;
        return match;
      },
    );
    // Merge consecutive <ul> blocks
    content = content.replace(/<\/ul>\s*<ul>/g, '');
    // Collapse runs of empty spacers and trim leading/trailing ones — no empty filler blocks.
    content = content
      .replace(/(<p class="sp"><\/p>\s*){2,}/g, '<p class="sp"></p>')
      .replace(/^(<p class="sp"><\/p>\s*)+/, '')
      .replace(/(<p class="sp"><\/p>\s*)+$/, '');

    sectionsHtml += `<section class="brk"><h1>${heading}</h1>${content}</section>`;
  });

  const bodyHtml = cover + sectionsHtml;

  return [
    '<!doctype html>',
    '<html lang="ru"><head><meta charset="utf-8">',
    `<title>ProductCamp report ${escapeHtml(snapshot.id)}</title>`,
    '<style>',
    '@page{size:A4;margin:20mm 15mm 20mm 30mm}',
    "body{font-family:'Times New Roman',Times,serif;font-size:14pt;line-height:1.5;color:#000;text-align:justify}",
    '.cover{text-align:center;page-break-after:always;height:247mm;display:flex;flex-direction:column;align-items:center}',
    '.cover-org{font-size:16pt;font-weight:bold;margin-top:25mm}',
    '.cover-track{font-size:13pt;font-weight:normal}',
    '.cover-title{font-size:20pt;font-weight:bold;margin-top:55mm;padding:0 10mm}',
    '.cover-sub{font-size:14pt;margin-top:6mm}',
    '.cover-meta{font-size:12pt;margin-top:auto;line-height:1.6}',
    '.toc{page-break-after:always}.toc h2{text-align:center;font-size:14pt}',
    '.toc ol{list-style:none;padding:0}.toc li{margin:2mm 0}',
    'h1{font-size:14pt;font-weight:bold;margin:0 0 4mm}',
    'section.brk{page-break-before:always}p.sp{height:6pt;margin:0}',
    'p{margin:0;white-space:pre-wrap}',
    'table{width:100%;border-collapse:collapse;margin:8pt 0}',
    'th,td{border:1px solid #333;padding:4pt 8pt;text-align:left;font-size:12pt}',
    'th{background:#f5f5f5;font-weight:bold}',
    'ul{margin:4pt 0;padding-left:20pt}',
    'li{margin:2pt 0}',
    'code{font-family:Courier New,monospace;font-size:12pt;background:#f0f0f0;padding:1pt 3pt}',
    'p.chart{text-align:center;margin:8pt 0}',
    'p.chart img{max-width:100%;height:auto}',
    '</style></head><body>',
    bodyHtml,
    '</body></html>',
  ].join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
