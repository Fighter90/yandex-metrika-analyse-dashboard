import {
  AlignmentType,
  convertMillimetersToTwip,
  Document,
  Footer,
  HeadingLevel,
  PageNumber,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { ReportSnapshot } from '@pca/shared';
import { reportSections } from './sections';

/**
 * Render a snapshot to a DOCX buffer, formatted to a ГОСТ-style document: Times New Roman 14pt with
 * 1.5 line spacing, A4 ГОСТ margins (left 30mm, right 15mm, top/bottom 20mm), a centered title page,
 * numbered sections and a page-number footer. Content is deterministic (see reportSections); the
 * .docx container carries zip timestamps, so byte-identity is approximated via content-determinism.
 */
export async function buildDocx(snapshot: ReportSnapshot): Promise<Buffer> {
  const children: Paragraph[] = [];
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
    for (const line of section.lines) {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
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
