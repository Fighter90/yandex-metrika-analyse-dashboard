import type { ReportSnapshot } from '@pca/shared';
import { reportSections } from '../docx/sections';

/** Parse inline markdown to HTML: **bold**, *italic*, `code`. */
function inlineToHtml(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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
  // The first section is the title page; the rest are numbered 1..N and listed in the TOC.
  const toc = all
    .slice(1)
    .map((s, j) => `<li>${j + 1}. ${escapeHtml(s.heading)}</li>`)
    .join('');

  let body = '';
  all.forEach((sec, i) => {
    const heading = i === 0 ? sec.heading : `${i}. ${escapeHtml(sec.heading)}`;
    const lines = sec.lines;
    let content = '';
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
    content = content.replace(/(<li>.*?<\/li>)/gs, (match) => {
      if (!match.startsWith('<ul>')) return `<ul>${match}</ul>`;
      return match;
    });
    // Merge consecutive <ul> blocks
    content = content.replace(/<\/ul>\s*<ul>/g, '');

    if (i === 0) {
      body += `<section class="cover"><h1>${escapeHtml(heading)}</h1>${content}` +
        `<p class="sub">Период: ${escapeHtml(snapshot.period.from)} — ${escapeHtml(snapshot.period.to)}</p></section>` +
        `<section class="toc"><h2>Содержание</h2><ol>${toc}</ol></section>`;
    } else {
      body += `<section class="brk"><h1>${escapeHtml(heading)}</h1>${content}</section>`;
    }
  });

  return [
    '<!doctype html>',
    '<html lang="ru"><head><meta charset="utf-8">',
    `<title>ProductCamp report ${escapeHtml(snapshot.id)}</title>`,
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
    'table{width:100%;border-collapse:collapse;margin:8pt 0}',
    'th,td{border:1px solid #333;padding:4pt 8pt;text-align:left;font-size:12pt}',
    'th{background:#f5f5f5;font-weight:bold}',
    'ul{margin:4pt 0;padding-left:20pt}',
    'li{margin:2pt 0}',
    'code{font-family:Courier New,monospace;font-size:12pt;background:#f0f0f0;padding:1pt 3pt}',
    '</style></head><body>',
    body,
    '</body></html>',
  ].join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
