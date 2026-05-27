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

/** Parse inline markdown: **bold**, *italic*, `code`. */
function parseInline(text: string): TextRun[] {
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
  const children: (Paragraph | Table)[] = [];
  reportSections(snapshot).forEach((section, i) => {
    // The first section is the centered title page; the rest start on a new page and are numbered.
    const heading = i === 0 ? section.heading : `${i}. ${section.heading}`;
    children.push(
      new Paragraph({
        heading: i === 0 ? HeadingLevel.TITLE : HeadingLevel.HEADING_1,
        alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
        pageBreakBefore: i > 0,
        children: [new TextRun(heading)],
      }),
    );

    // Embed the section's chart PNG (FINAL §6.4), if rendered into the snapshot.
    const chartBase64 = section.chartId ? snapshot.charts?.[section.chartId] : undefined;
    if (chartBase64) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
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

    // Process lines, detecting tables
    const lines = section.lines;
    let lineIdx = 0;
    while (lineIdx < lines.length) {
      const line = lines[lineIdx]!;

      // Try to parse a table
      if (isTableRow(line)) {
        const result = parseTable(lines, lineIdx);
        if (result) {
          children.push(result.table);
          lineIdx += result.consumed;
          continue;
        }
      }

      // Detect list items (lines starting with - or *)
      if (line.startsWith('- ') || line.startsWith('* ')) {
        children.push(
          new Paragraph({
            children: parseInline(line.slice(2)),
            bullet: { level: 0 },
          }),
        );
      } else if (line === '') {
        children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      } else {
        children.push(new Paragraph({ children: parseInline(line) }));
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
