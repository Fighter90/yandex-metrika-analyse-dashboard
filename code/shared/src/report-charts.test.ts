import { describe, it, expect } from 'vitest';
import type { ReportSnapshot } from './index';
import {
  REPORT_CHART_IDS,
  REPORT_CHART_TITLES,
  reportChartOption,
  chartRecommendation,
} from './index';

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

describe('reportChartOption', () => {
  it('builds a deterministic, animation-free option for every chart id', () => {
    const s = { ...base, channels: [ch('Direct', 100, 8), ch('Direct', 50, 2), ch('Ad', 40, 1)] };
    for (const id of REPORT_CHART_IDS) {
      const opt = reportChartOption(s, id);
      expect(opt.animation).toBe(false);
      // Same input → identical option object (deterministic).
      expect(JSON.stringify(reportChartOption(s, id))).toBe(JSON.stringify(opt));
      expect(REPORT_CHART_TITLES[id]).toBeTruthy();
    }
  });

  it('aggregates channels by name in the bar chart series', () => {
    const opt = reportChartOption(
      { ...base, channels: [ch('Direct', 100, 5), ch('Direct', 50, 3)] },
      'channelBar',
    );
    const series = opt.series as Array<{ name: string; data: number[] }>;
    expect(series[0]!.data).toEqual([150]); // visits summed
    expect(series[1]!.data).toEqual([8]); // reaches summed
  });

  it('maps funnel stages into the funnel series', () => {
    const opt = reportChartOption(
      {
        ...base,
        funnel: { visits: 100, b2cApplications: 10, b2bPipelineTickets: 4, b2bPaidTickets: 2 },
      },
      'funnel',
    );
    const data = (opt.series as Array<{ data: Array<{ value: number }> }>)[0]!.data;
    expect(data.map((d) => d.value)).toEqual([100, 10, 4, 2]);
  });
});

describe('chartRecommendation', () => {
  it('reports no data for channel charts when there are no visits', () => {
    for (const id of ['channelBar', 'channelMix'] as const) {
      const rec = chartRecommendation(base, id);
      expect(rec.bad.join(' ')).toMatch(/Нет данных/);
      expect(rec.good).toHaveLength(0);
    }
  });

  it('channelBar praises the best channel and flags the worst', () => {
    const rec = chartRecommendation(
      { ...base, channels: [ch('Direct', 100, 8), ch('Ad', 200, 1)] },
      'channelBar',
    );
    expect(rec.good.join(' ')).toMatch(/Лучший канал «Direct»/);
    expect(rec.bad.join(' ')).toMatch(/Канал «Ad»/);
  });

  it('channelBar falls back to neutral text when no channel has enough traffic', () => {
    const rec = chartRecommendation({ ...base, channels: [ch('Direct', 10, 0)] }, 'channelBar');
    expect(rec.good.join(' ')).toMatch(/Явных сильных сторон/);
    expect(rec.bad.join(' ')).toMatch(/Явных проблем/);
  });

  it('channelMix flags over-dependence on one channel', () => {
    const rec = chartRecommendation(
      { ...base, channels: [ch('Direct', 800, 10), ch('Ad', 100, 1)] },
      'channelMix',
    );
    expect(rec.bad.join(' ')).toMatch(/высокая зависимость/);
  });

  it('channelMix praises a diversified mix', () => {
    const rec = chartRecommendation(
      { ...base, channels: [ch('Direct', 100, 5), ch('Ad', 100, 5)] },
      'channelMix',
    );
    expect(rec.good.join(' ')).toMatch(/диверсифицирован/);
  });

  it('funnel praises a healthy CR and a met goal', () => {
    const rec = chartRecommendation(
      {
        ...base,
        kpi: { target: 300, b2cApplications: 8, b2bPaidTickets: 300, gap: 0 },
        funnel: { visits: 100, b2cApplications: 8, b2bPipelineTickets: 0, b2bPaidTickets: 300 },
      },
      'funnel',
    );
    expect(rec.good.join(' ')).toMatch(/Конверсия визит → заявка/);
    expect(rec.good.join(' ')).toMatch(/достигнута/);
  });

  it('funnel flags a low CR and the KPI gap', () => {
    const rec = chartRecommendation(
      {
        ...base,
        kpi: { target: 300, b2cApplications: 1, b2bPaidTickets: 10, gap: 290 },
        funnel: { visits: 100, b2cApplications: 1, b2bPipelineTickets: 0, b2bPaidTickets: 10 },
      },
      'funnel',
    );
    expect(rec.bad.join(' ')).toMatch(/ниже 2%/);
    expect(rec.bad.join(' ')).toMatch(/не хватает 290/);
  });

  it('funnel uses neutral fallback when CR is between thresholds and goal met', () => {
    const rec = chartRecommendation(
      {
        ...base,
        kpi: { target: 300, b2cApplications: 3, b2bPaidTickets: 300, gap: 0 },
        funnel: { visits: 100, b2cApplications: 3, b2bPipelineTickets: 0, b2bPaidTickets: 300 },
      },
      'funnel',
    );
    // CR 3% is neither ≥5% nor <2% → no CR line; goal met → good has the goal line, bad falls back.
    expect(rec.bad.join(' ')).toMatch(/Явных проблем/);
  });
});
