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

describe('reportSections', () => {
  it('produces the expected section headings with content', () => {
    const sections = reportSections(snapshot);
    expect(sections.map((s) => s.heading)).toEqual([
      'ProductCamp · Конверсии и лидген',
      'Executive Summary',
      'Methodology',
      'Define — Problem Hypotheses',
      'Develop — Solution Hypotheses',
      'Deliver — Decision Log',
      'Топ источников UTM',
      'Топ гео + устройства',
      'Топ страниц входа',
      'Топ страниц выхода',
      'Data Appendix',
    ]);
    expect(sections[2]?.lines.join(' ')).toContain('Voronik1801');
    expect(sections.find((s) => s.heading.startsWith('Deliver'))?.lines[0]).toContain('DL-001');
    expect(sections.find((s) => s.heading.startsWith('Define'))?.lines[0]).toContain('ICE 336');
  });

  it('renders the breakdown lines when present (UTM, geo/device, entry + exit pages)', () => {
    const sections = reportSections({
      ...snapshot,
      breakdowns: {
        utm: [{ source: 'vk', medium: 'cpc', campaign: 'spring', visits: 80, goalReaches: 4 }],
        geoDevice: [{ country: 'Россия', device: 'mobile', visits: 60, goalReaches: 3 }],
        entryPages: [{ page: '/lp', visits: 70, bounceRate: 0.25, goalReaches: 4 }],
        exitPages: [{ page: '/checkout', visits: 40, bounceRate: 0.6, goalReaches: 2 }],
      },
    });
    const line = (h: string): string => sections.find((s) => s.heading === h)?.lines[0] ?? '';
    expect(line('Топ источников UTM')).toContain('vk / cpc / spring');
    expect(line('Топ гео + устройства')).toContain('Россия · mobile');
    expect(line('Топ страниц входа')).toContain('/lp');
    expect(line('Топ страниц входа')).toContain('25.0%');
    expect(line('Топ страниц выхода')).toContain('/checkout');
  });

  it('is deterministic — same snapshot yields identical content', () => {
    expect(reportSections(snapshot)).toEqual(reportSections(snapshot));
  });

  it('includes an AI-анализ section only when aiNarrative is present', () => {
    expect(reportSections(snapshot).some((s) => s.heading.startsWith('AI-анализ'))).toBe(false);
    const withAi = reportSections({ ...snapshot, aiNarrative: 'Итог: рост.\n\nРиски: отвал.' });
    const ai = withAi.find((s) => s.heading.startsWith('AI-анализ'));
    expect(ai?.lines).toEqual(['Итог: рост.', 'Риски: отвал.']); // blank lines dropped
  });
});

describe('buildDocx', () => {
  it('renders a valid .docx (zip) buffer', async () => {
    const buf = await buildDocx(snapshot);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK'); // zip magic
  });
});
