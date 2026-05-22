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
});
