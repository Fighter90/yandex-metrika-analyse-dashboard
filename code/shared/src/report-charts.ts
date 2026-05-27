/**
 * Deterministic ECharts option builders + per-chart 🟢/🔴 interpretation for the report (FINAL §6.3/§6.4).
 *
 * These are pure functions of a {@link ReportSnapshot}: same data → same option object and the same
 * recommendation text. The headless chart renderer (backend, coverage-excluded) turns the option
 * into a PNG; this module — and the per-chart traffic-light block — are fully unit-tested so the
 * report's chart content stays traceable. Animations are disabled for byte-stable rendering.
 */
import type { ReportSnapshot, ReportChartId } from './types/report';
import { REPORT_BENCHMARKS } from './report-recommendations';

export const REPORT_CHART_IDS = ['channelBar', 'funnel', 'channelMix'] as const;

export const REPORT_CHART_TITLES: Record<ReportChartId, string> = {
  channelBar: 'Визиты и заявки по каналам',
  funnel: 'Воронка: визит → заявка → оплата',
  channelMix: 'Доля каналов по визитам',
};

/** Fixed GOST-friendly palette (deterministic order). */
const PALETTE = ['#1d4ed8', '#0891b2', '#16a34a', '#ca8a04', '#dc2626', '#7c3aed', '#475569'];
const BASE_TEXT = { fontFamily: 'Times New Roman, serif', color: '#000' } as const;

type ChartOption = Record<string, unknown>;

/** Aggregate channels by name (sum visits + reaches), sorted by visits desc. */
function channelTotals(
  s: ReportSnapshot,
): Array<{ channel: string; visits: number; goalReaches: number }> {
  const map = new Map<string, { visits: number; goalReaches: number }>();
  for (const c of s.channels) {
    const cur = map.get(c.channel) ?? { visits: 0, goalReaches: 0 };
    map.set(c.channel, {
      visits: cur.visits + c.visits,
      goalReaches: cur.goalReaches + c.goalReaches,
    });
  }
  return [...map.entries()]
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.visits - a.visits);
}

function channelBarOption(s: ReportSnapshot): ChartOption {
  const totals = channelTotals(s);
  return {
    animation: false,
    textStyle: BASE_TEXT,
    color: PALETTE,
    grid: { left: 48, right: 16, top: 40, bottom: 64, containLabel: true },
    legend: { data: ['Визиты', 'Заявки'], top: 8, textStyle: BASE_TEXT },
    xAxis: {
      type: 'category',
      data: totals.map((t) => t.channel),
      axisLabel: { interval: 0, rotate: 30, color: '#000' },
    },
    yAxis: { type: 'value', scale: true },
    series: [
      { name: 'Визиты', type: 'bar', data: totals.map((t) => t.visits), barMaxWidth: 48 },
      { name: 'Заявки', type: 'bar', data: totals.map((t) => t.goalReaches), barMaxWidth: 48 },
    ],
  };
}

function funnelOption(s: ReportSnapshot): ChartOption {
  const f = s.funnel;
  return {
    animation: false,
    textStyle: BASE_TEXT,
    color: PALETTE,
    series: [
      {
        type: 'funnel',
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside', color: '#fff' },
        data: [
          { value: f.visits, name: 'Визиты' },
          { value: f.b2cApplications, name: 'Заявки B2C' },
          { value: f.b2bPipelineTickets, name: 'B2B в работе' },
          { value: f.b2bPaidTickets, name: 'Оплачено B2B' },
        ],
      },
    ],
  };
}

function channelMixOption(s: ReportSnapshot): ChartOption {
  const totals = channelTotals(s);
  return {
    animation: false,
    textStyle: BASE_TEXT,
    color: PALETTE,
    legend: { bottom: 0, textStyle: BASE_TEXT },
    series: [
      {
        type: 'pie',
        radius: ['35%', '65%'],
        label: { formatter: '{b}: {d}%', color: '#000' },
        data: totals.map((t) => ({ value: t.visits, name: t.channel })),
      },
    ],
  };
}

/** ECharts option for a report chart (deterministic, animations off). */
export function reportChartOption(s: ReportSnapshot, id: ReportChartId): ChartOption {
  switch (id) {
    case 'channelBar':
      return channelBarOption(s);
    case 'funnel':
      return funnelOption(s);
    case 'channelMix':
      return channelMixOption(s);
  }
}

export interface ChartRecommendation {
  readonly good: readonly string[];
  readonly bad: readonly string[];
}

const pct = (r: number): string => `${(r * 100).toFixed(1)}%`;

/**
 * Per-chart 🟢/🔴 interpretation (FINAL §6.3) — a small traffic-light block tied to one diagram,
 * derived purely from snapshot numbers against {@link REPORT_BENCHMARKS}. Deterministic.
 */
export function chartRecommendation(s: ReportSnapshot, id: ReportChartId): ChartRecommendation {
  const good: string[] = [];
  const bad: string[] = [];
  const totals = channelTotals(s);
  const totalVisits = totals.reduce((a, t) => a + t.visits, 0);

  if (id === 'channelBar' || id === 'channelMix') {
    if (totalVisits === 0) {
      bad.push('Нет данных по каналам за период.');
      return { good, bad };
    }
  }

  if (id === 'channelBar') {
    const sized = totals
      .filter((t) => t.visits >= REPORT_BENCHMARKS.minVisits)
      .map((t) => ({ ...t, cr: t.goalReaches / t.visits }));
    if (sized.length > 0) {
      const best = [...sized].sort((a, b) => b.cr - a.cr)[0]!;
      const worst = [...sized].sort((a, b) => a.cr - b.cr)[0]!;
      if (best.cr >= REPORT_BENCHMARKS.crGood) {
        good.push(`Лучший канал «${best.channel}»: CR ${pct(best.cr)} — масштабировать.`);
      }
      if (worst.channel !== best.channel && worst.cr < REPORT_BENCHMARKS.crBad) {
        bad.push(`Канал «${worst.channel}»: CR ${pct(worst.cr)} — проверить качество трафика.`);
      }
    }
  }

  if (id === 'channelMix') {
    // totalVisits > 0 here (early return above), so there is at least one channel.
    const top = totals[0]!;
    const share = top.visits / totalVisits;
    if (share >= 0.7) {
      bad.push(
        `Канал «${top.channel}» даёт ${pct(share)} визитов — высокая зависимость от одного источника.`,
      );
    } else {
      good.push(`Трафик диверсифицирован: топ-канал «${top.channel}» — ${pct(share)} визитов.`);
    }
  }

  if (id === 'funnel') {
    const f = s.funnel;
    const cr = f.visits > 0 ? f.b2cApplications / f.visits : 0;
    if (cr >= REPORT_BENCHMARKS.crGood) {
      good.push(`Конверсия визит → заявка ${pct(cr)} — на уровне/выше ориентира 5%.`);
    } else if (cr < REPORT_BENCHMARKS.crBad) {
      bad.push(`Конверсия визит → заявка ${pct(cr)} — ниже 2%.`);
    }
    if (s.kpi.gap <= 0) {
      good.push(`Цель ${s.kpi.target} оплаченных билетов достигнута.`);
    } else {
      bad.push(`До цели не хватает ${s.kpi.gap} оплаченных билетов.`);
    }
  }

  if (good.length === 0) good.push('Явных сильных сторон по порогам не выявлено.');
  if (bad.length === 0) bad.push('Явных проблем по порогам не выявлено.');
  return { good, bad };
}
