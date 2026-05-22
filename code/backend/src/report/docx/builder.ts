import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { ReportSnapshot } from '@pca/shared';
import { reportSections } from './sections';

/**
 * Render a snapshot to a DOCX buffer. Content is deterministic (see reportSections); the .docx
 * container itself carries zip timestamps, so byte-identity is approximated via content-determinism.
 */
export async function buildDocx(snapshot: ReportSnapshot): Promise<Buffer> {
  const children: Paragraph[] = [];
  for (const section of reportSections(snapshot)) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(section.heading)] }),
    );
    for (const line of section.lines) {
      children.push(new Paragraph({ children: [new TextRun(line)] }));
    }
  }
  const doc = new Document({
    creator: 'ProductCamp Analytics',
    title: `ProductCamp report ${snapshot.id}`,
    sections: [{ children }],
  });
  return Packer.toBuffer(doc);
}
