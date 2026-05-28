import {
  AlignmentType,
  convertMillimetersToTwip,
  Document,
  Footer,
  HeadingLevel,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { ReportSnapshot } from '@pca/shared';
import { reportSections } from './sections';

/** Parse inline markdown: **bold**, *italic*, `code`. Exported for unit coverage of the
 * empty-string fallback (callers normally pass non-empty text). */
export function parseInline(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\*\*(.+?)\*\*|`(.+?)`|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun(text.slice(lastIndex, match.index)));
    }
    if (match[1]) {
      runs.push(new TextRun({ text: match[1], bold: true }));
    } else if (match[2]) {
      runs.push(new TextRun({ text: match[2], font: 'Courier New', size: 24 }));
    } else if (match[3]) {
      runs.push(new TextRun({ text: match[3], italics: true }));
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun(text.slice(lastIndex)));
  }
  return runs.length > 0 ? runs : [new TextRun(text)];
}

/** Detect if a line is a table row (starts and ends with |). */
function isTableRow(line: string): boolean {
  return line.startsWith('|') && line.endsWith('|') && line.split('|').length > 2;
}

/** Parse a markdown table from lines. Returns [headerRow, ...dataRows] and number of lines consumed. */
function parseTable(lines: string[], startIdx: number): { table: Table; consumed: number } | null {
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

  const headerRow = new TableRow({
    children: headerCells.map(
      (cell) =>
        new TableCell({
          children: [new Paragraph({ children: parseInline(cell.trim()) })],
          shading: { fill: 'F8FAFC', type: 'clear' },
        }),
    ),
  });

  const dataRowsParsed = dataRows.map(
    (cells) =>
      new TableRow({
        children: cells.map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({ children: parseInline(cell.trim()) })],
            }),
        ),
      }),
  );

  return {
    table: new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRowsParsed],
    }),
    consumed: tableLines.length,
  };
}

/**
 * Render a snapshot to a DOCX buffer, formatted to a ГОСТ-style document: Times New Roman 14pt with
 * 1.5 line spacing, A4 ГОСТ margins (left 30mm, right 15mm, top/bottom 20mm), a centered title page,
 * numbered sections and a page-number footer. Content is deterministic (see reportSections); the
 * .docx container carries zip timestamps, so byte-identity is approximated via content-determinism.
 *
 * Supports markdown tables, **bold**, *italic*, and `code` inline formatting.
 */
export async function buildDocx(snapshot: ReportSnapshot): Promise<Buffer> {
  const sections = reportSections(snapshot);
  const body = sections.slice(1); // section 0 is replaced by a proper GOST title page
  const children: (Paragraph | Table)[] = [];

  const blanks = (n: number): Paragraph[] =>
    Array.from({ length: n }, () => new Paragraph({ children: [] }));
  const centered = (text: string, size: number, bold = false): Paragraph =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, size, bold })],
    });
  const year = /^\d{4}/.test(snapshot.generatedAt)
    ? snapshot.generatedAt.slice(0, 4)
    : snapshot.period.from.slice(0, 4);

  // ---- ГОСТ title page (Р 7.32-2017): org on top, work title centred, snapshot id + year below ----
  children.push(
    centered('ProductCamp', 32, true),
    centered('Трек «Конверсии и лидген»', 28),
    ...blanks(6),
    centered('Аналитический отчёт по конверсиям и лидгену', 36, true),
    ...blanks(1),
    centered(`за период ${snapshot.period.from} — ${snapshot.period.to}`, 28),
    ...blanks(10),
    centered(`Идентификатор среза данных: ${snapshot.id}`, 24),
    centered(`Сформирован: ${snapshot.generatedAt}`, 24),
    centered(`Цель: ${snapshot.kpi.target} оплаченных билетов`, 24),
    ...blanks(2),
    centered(year, 24),
  );

  // ---- Содержание (manual TOC of numbered sections) ----
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      pageBreakBefore: true,
      children: [new TextRun('Содержание')],
    }),
  );
  body.forEach((s, j) =>
    children.push(new Paragraph({ children: [new TextRun(`${j + 1}. ${s.heading}`)] })),
  );

  // ---- Body sections (numbered, each on a new page) ----
  body.forEach((section, j) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.LEFT,
        pageBreakBefore: true,
        spacing: { after: 120 },
        children: [new TextRun(`${j + 1}. ${section.heading}`)],
      }),
    );

    // Embed the section's chart PNG (FINAL §6.4), if rendered into the snapshot.
    const chartBase64 = section.chartId ? snapshot.charts?.[section.chartId] : undefined;
    if (chartBase64) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [
            new ImageRun({
              type: 'png',
              data: Buffer.from(chartBase64, 'base64'),
              transformation: { width: 600, height: 340 },
            }),
          ],
        }),
      );
    }

    // Process lines: tables, bullet lists, justified paragraphs. Collapse blank runs and trim
    // leading/trailing blanks so the document has no empty filler blocks.
    const lines = section.lines;
    let lineIdx = 0;
    let emittedInSection = false;
    let pendingBlank = false;
    while (lineIdx < lines.length) {
      const line = lines[lineIdx]!;

      if (isTableRow(line)) {
        const result = parseTable(lines, lineIdx);
        if (result) {
          pendingBlank = false;
          children.push(result.table);
          emittedInSection = true;
          lineIdx += result.consumed;
          continue;
        }
      }

      if (line === '') {
        // Defer blank lines; only emit a single spacer between real content (never leading/consecutive).
        if (emittedInSection) pendingBlank = true;
      } else {
        if (pendingBlank) {
          children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
          pendingBlank = false;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          children.push(
            new Paragraph({ children: parseInline(line.slice(2)), bullet: { level: 0 } }),
          );
        } else {
          children.push(
            new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: parseInline(line) }),
          );
        }
        emittedInSection = true;
      }
      lineIdx++;
    }
  });

  const doc = new Document({
    creator: 'ProductCamp Analytics',
    title: `ProductCamp report ${snapshot.id}`,
    // ГОСТ defaults: Times New Roman 14pt (size is half-points → 28), 1.5 line spacing (240 × 1.5).
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 28 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(20),
              bottom: convertMillimetersToTwip(20),
              left: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(15),
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT] })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
