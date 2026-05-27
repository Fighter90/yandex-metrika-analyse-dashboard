import { describe, it, expect } from 'vitest';
import type { ReportSnapshot } from './index';
import { buildReportRecommendations } from './index';

const base: ReportSnapshot = {
  id: 's',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 0, b2bPaidTickets: 0, gap: 300 },
  channels: [],
  hypotheses: { problems: [], solutions: [] },
  decisions: [],
  b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
  funnel: { visits: 0, b2cApplications: 0, b2bPipelineTickets: 0, b2bPaidTickets: 0 },
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

const ch = (channel: string, visits: number, goalReaches: number) => ({
  date: '2025-01-01',
  channel,
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  visits,
  users: visits,
  bounceRate: 0.2,
  avgDuration: 60,
  goalReaches,
  conversionRate: visits ? goalReaches / visits : 0,
});

describe('buildReportRecommendations', () => {
  it('flags the no-data case', () => {
    const rec = buildReportRecommendations(base);
    expect(rec.bad.join(' ')).toMatch(/Нет данных/);
    expect(rec.good).toHaveLength(0);
  });

  it('praises a healthy overall CR, best channel and a met goal', () => {
    const rec = buildReportRecommendations({
      ...base,
      kpi: { target: 300, b2cApplications: 400, b2bPaidTickets: 300, gap: 0 },
      channels: [ch('Direct', 100, 8)], // CR 8% ≥ 5%
    });
    expect(rec.good.join(' ')).toMatch(/Общий CR/);
    expect(rec.good.join(' ')).toMatch(/Лучший канал/);
    expect(rec.good.join(' ')).toMatch(/достигнута/);
  });

  it('flags a low overall CR, a weak channel, high bounce, and the KPI gap', () => {
    const rec = buildReportRecommendations({
      ...base,
      kpi: { target: 300, b2cApplications: 5, b2bPaidTickets: 10, gap: 290 },
      channels: [ch('Direct', 100, 1), ch('Ad', 200, 1)], // overall 2/300 ≈ 0.7% <2%; worst Ad 0.5%
      breakdowns: {
        ...base.breakdowns,
        entryPages: [{ page: '/lp', visits: 80, bounceRate: 0.8, goalReaches: 1 }],
      },
    });
    const badText = rec.bad.join(' ');
    expect(badText).toMatch(/Общий CR/); // overall CR < 2% branch
    expect(badText).toMatch(/Канал «Ad»/);
    expect(badText).toMatch(/отказы/);
    expect(badText).toMatch(/не хватает 290/);
  });

  it('uses the neutral fallbacks when nothing crosses a threshold', () => {
    // single mid-CR channel (3% — between 2% and 5%), goal not met but covered by gap branch
    const rec = buildReportRecommendations({
      ...base,
      kpi: { target: 300, b2cApplications: 3, b2bPaidTickets: 0, gap: 300 },
      channels: [ch('Direct', 100, 3)],
    });
    expect(rec.good.join(' ')).toMatch(/Явных сильных сторон/);
    expect(rec.bad.length).toBeGreaterThan(0); // gap line present
  });
});
