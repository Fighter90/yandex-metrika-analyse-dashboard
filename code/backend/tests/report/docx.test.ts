import { describe, it, expect } from 'vitest';
import type { Decision, Hypothesis, ReportSnapshot } from '@pca/shared';
import { reportSections } from '../../src/report/docx/sections';
import { buildDocx } from '../../src/report/docx/builder';

const hyp = (over: Partial<Hypothesis>): Hypothesis => ({
  id: 1,
  diamondPhase: 'define',
  kind: 'problem',
  subject: 'слушатель',
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
  ...over,
});

const decision: Decision = {
  id: 1,
  number: 'DL-001',
  hypothesisId: 1,
  date: '2025-01-10',
  method: 'mixed',
  scope: '5 интервью',
  periodDays: 5,
  findings: [],
  evidence: [{ quote: 'q', source: 's' }],
  outcome: 'yellow',
  outcomeRationale: 'r',
  nextStep: 'онлайн-оплата',
  decidedBy: 'team',
  createdAt: 'c',
  updatedAt: 'u',
};

const snapshot: ReportSnapshot = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
  channels: [
    {
      date: '2025-01-02',
      channel: 'podcast',
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      visits: 100,
      users: 90,
      bounceRate: 0.2,
      avgDuration: 60,
      goalReaches: 7,
      conversionRate: 0.07,
    },
  ],
  hypotheses: { problems: [hyp({ kind: 'problem' })], solutions: [hyp({ kind: 'solution' })] },
  decisions: [decision],
  b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
  funnel: { visits: 100, b2cApplications: 7, b2bPipelineTickets: 0, b2bPaidTickets: 20 },
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

// reportSections content is exhaustively tested in @pca/shared (report-sections.test.ts);
// here we only smoke-test the re-export the DOCX/PDF backend renderers consume.
describe('reportSections re-export', () => {
  it('renders the expanded report with cover, full hypothesis cards and decision detail', () => {
    const sections = reportSections(snapshot);
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('ProductCamp · Конверсии и лидген');
    expect(headings).toContain('Приоритизация гипотез (по ICE)');
    expect(headings.some((h) => h.startsWith('DL-001'))).toBe(true);
    const methodology = sections.find((s) => s.heading === 'Методология');
    expect(methodology?.lines.join(' ')).toContain('Double Diamond');
  });
});

describe('buildDocx', () => {
  it('renders a valid .docx (zip) buffer', async () => {
    const buf = await buildDocx(snapshot);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK'); // zip magic
  });

  it('builds a valid .docx with an ISO generatedAt (title-page year branch)', async () => {
    const buf = await buildDocx({ ...snapshot, generatedAt: '2026-05-28T10:00:00.000Z' });
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('embeds chart PNGs (ImageRun) when the snapshot carries rendered charts (§6.4)', async () => {
    // 1x1 transparent PNG — enough to exercise the ImageRun embedding branch.
    const png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const withCharts: ReportSnapshot = {
      ...snapshot,
      charts: { channelBar: png, funnel: png, channelMix: png },
    };
    const withoutCharts = await buildDocx(snapshot);
    const buf = await buildDocx(withCharts);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
    // Embedding images makes the document strictly larger.
    expect(buf.length).toBeGreaterThan(withoutCharts.length);
  });

  it('renders markdown tables, bold/italic/code inline and list items via aiNarrative', async () => {
    // This snapshot injects markdown content through aiNarrative → parseChunkedNarrative →
    // section.lines → buildDocx, exercising parseInline (bold/italic/code), parseTable,
    // isTableRow (true branch), and the list-item branch in the line loop.
    const markdownSnapshot: ReportSnapshot = {
      ...snapshot,
      aiNarrative: [
        '## Markdown Coverage Section',
        '**bold text** and *italic text* and `code snippet` here',
        'prefix **bold** suffix',
        '- list item one',
        '* list item two',
        '| Канал | Визиты | CR |',
        '|---|---|---|',
        '| tg | 100 | 7.0% |',
        '| vk | 50 | 3.5% |',
      ].join('\n'),
    };
    const buf = await buildDocx(markdownSnapshot);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('handles a single-row table line (parseTable returns null → falls through to paragraph)', async () => {
    // A line starting with | but without a second row causes parseTable to return null;
    // the builder then renders it as a plain paragraph via parseInline.
    const singleRowSnapshot: ReportSnapshot = {
      ...snapshot,
      aiNarrative: '## Single Row Section\n| only one row |',
    };
    const buf = await buildDocx(singleRowSnapshot);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('handles parseInline with no markup (plain-text fallback run)', async () => {
    // Plain text with no **bold**, *italic*, or `code` → parseInline returns [new TextRun(text)]
    const plainSnapshot: ReportSnapshot = {
      ...snapshot,
      aiNarrative: '## Plain Section\njust plain text here',
    };
    const buf = await buildDocx(plainSnapshot);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('handles a list item with no content (parseInline called with empty string)', async () => {
    // A line "- " (dash-space only) causes line.slice(2) = '' → parseInline('') →
    // runs stays empty → returns [new TextRun('')], covering the false branch of line 42.
    const emptyListItemSnapshot: ReportSnapshot = {
      ...snapshot,
      aiNarrative: '## Empty List Item\n- ',
    };
    const buf = await buildDocx(emptyListItemSnapshot);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });
});
