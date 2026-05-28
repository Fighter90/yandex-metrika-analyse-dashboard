import { describe, it, expect } from 'vitest';
import type { ReportSnapshot } from '@pca/shared';
import { reportHtml } from '../../src/report/pdf/html';

const snapshot: ReportSnapshot = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: {
    problems: [
      {
        id: 1,
        diamondPhase: 'define',
        kind: 'problem',
        subject: 'a<b>&c', // exercises HTML escaping
        action: 'не покупает',
        solution: 'билет',
        condition: 'нет лендинга',
        title: 't',
        hiddenAssumptions: [],
        validationMethods: [],
        impact: 8,
        confidence: 6,
        ease: 7,
        impactRationale: 'r',
        confidenceRationale: 'r',
        easeRationale: 'r',
        iceScore: 336,
        greenCriteria: 'g',
        yellowCriteria: 'y',
        redCriteria: 'r',
        deadlineDays: 5,
        deadlineAt: '2999-01-01T00:00:00.000Z',
        status: 'draft',
        createdAt: 'c',
        updatedAt: 'u',
      },
    ],
    solutions: [],
  },
  decisions: [],
  b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
  funnel: { visits: 0, b2cApplications: 7, b2bPipelineTickets: 0, b2bPaidTickets: 20 },
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

describe('reportHtml', () => {
  it('produces a ГОСТ-formatted HTML document (cover, TOC, numbered sections, A4/Times New Roman)', () => {
    const html = reportHtml(snapshot);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('@page{size:A4;margin:20mm 15mm 20mm 30mm}');
    expect(html).toContain(
      "font-family:'Times New Roman',Times,serif;font-size:14pt;line-height:1.5",
    );
    expect(html).toContain('class="cover"');
    expect(html).toContain('class="cover-title"');
    expect(html).toContain('Содержание');
    expect(html).toContain('за период 2025-01-01 — 2025-01-07');
    expect(html).toContain('<h1>1. Краткие итоги</h1>');
    expect(html).toContain('<li>1. Краткие итоги</li>');
  });

  it('escapes &, < and > in content', () => {
    expect(reportHtml(snapshot)).toContain('a&lt;b&gt;&amp;c');
  });

  it('derives the title-page year from an ISO generatedAt', () => {
    const html = reportHtml({ ...snapshot, generatedAt: '2026-05-28T10:00:00.000Z' });
    expect(html).toContain('class="cover-meta"');
    expect(html).toContain('2026');
  });

  it('embeds chart images as data URIs when the snapshot carries rendered charts (§6.4)', () => {
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = reportHtml({
      ...snapshot,
      charts: { channelBar: png, funnel: png, channelMix: png },
    });
    expect(html).toContain(`src="data:image/png;base64,${png}"`);
    expect(html).toContain('class="chart"');
    // Without charts, no image is emitted.
    expect(reportHtml(snapshot)).not.toContain('data:image/png;base64');
  });

  it('renders markdown tables, bold/italic/code and list items via aiNarrative', () => {
    // Exercises renderTable, inlineToHtml (with **bold**, *italic*, `code`),
    // the list-item branch, and the <ul> wrapping regex in reportHtml.
    const markdownSnapshot: ReportSnapshot = {
      ...snapshot,
      aiNarrative: [
        '## Markdown Coverage Section',
        '**bold text** and *italic text* and `code snippet` here',
        '- list item one',
        '* list item two',
        '| Канал | Визиты |',
        '|---|---|',
        '| tg | 100 |',
        '| vk | 50 |',
      ].join('\n'),
    };
    const html = reportHtml(markdownSnapshot);
    // Table is rendered directly (not run through escapeHtml), so tags appear verbatim
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
    // inlineToHtml escapes text FIRST, then emits REAL emphasis tags — so bold/italic render as
    // actual <strong>/<em> (not escaped «&lt;strong&gt;» literals in the PDF). (v2.9.3 tag-leak fix)
    expect(html).toContain('<strong>bold text</strong>');
    expect(html).toContain('<em>italic text</em>');
    expect(html).toContain('<code>code snippet</code>');
    expect(html).not.toContain('&lt;strong&gt;'); // no escaped/leaked tags
    expect(html).toContain('<li>');
    expect(html).toContain('<ul>');
  });

  it('handles a single-row table line (renderTable returns null → paragraph fallback)', () => {
    // A | row | with no second row causes renderTable to return null; line renders as <p>.
    const singleRowSnapshot: ReportSnapshot = {
      ...snapshot,
      aiNarrative: '## Single Row\n| only one row |',
    };
    const html = reportHtml(singleRowSnapshot);
    // No table rendered — the | line falls through to inlineToHtml as a plain paragraph
    expect(html).toContain('<p>');
    expect(html).not.toContain('<table>');
  });
});
