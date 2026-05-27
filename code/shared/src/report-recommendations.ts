import type { ReportSnapshot } from './types/report';

/** Conversion-rate / bounce benchmarks used for the report's 🟢/🔴 recommendations. */
export const REPORT_BENCHMARKS = {
  /** CR at/above this is healthy. */
  crGood: 0.05,
  /** CR below this is a problem. */
  crBad: 0.02,
  /** Bounce at/above this on an entry page is a problem. */
  bounceBad: 0.7,
  /** Minimum visits for a channel/page signal to be trustworthy. */
  minVisits: 50,
} as const;

export interface ReportRecommendations {
  readonly good: readonly string[];
  readonly bad: readonly string[];
}

const pct = (r: number): string => `${(r * 100).toFixed(1)}%`;

/**
 * Deterministic «🟢 что хорошо / 🔴 что плохо» recommendations for the report, derived purely from
 * snapshot numbers against {@link REPORT_BENCHMARKS}. No AI, no clock — fully reproducible and
 * traceable. Used by reportSections so DOCX/PDF/screen all carry the same block.
 */
export function buildReportRecommendations(s: ReportSnapshot): ReportRecommendations {
  const good: string[] = [];
  const bad: string[] = [];

  const totalVisits = s.channels.reduce((a, c) => a + c.visits, 0);
  const totalReaches = s.channels.reduce((a, c) => a + c.goalReaches, 0);
  const overallCr = totalVisits > 0 ? totalReaches / totalVisits : 0;

  if (totalVisits === 0) {
    bad.push('Нет данных по каналам за период — синхронизируйте данные из Метрики.');
    return { good, bad };
  }

  if (overallCr >= REPORT_BENCHMARKS.crGood) {
    good.push(`Общий CR ${pct(overallCr)} — на уровне или выше ориентира 5%.`);
  } else if (overallCr < REPORT_BENCHMARKS.crBad) {
    bad.push(`Общий CR ${pct(overallCr)} — ниже 2%, проверьте качество трафика и посадочные.`);
  }

  // Best / worst channel by CR among those with enough traffic.
  const sized = s.channels
    .filter((c) => c.visits >= REPORT_BENCHMARKS.minVisits)
    .map((c) => ({ channel: c.channel, visits: c.visits, cr: c.goalReaches / c.visits }));
  if (sized.length > 0) {
    const best = [...sized].sort((a, b) => b.cr - a.cr)[0]!;
    const worst = [...sized].sort((a, b) => a.cr - b.cr)[0]!;
    if (best.cr >= REPORT_BENCHMARKS.crGood) {
      good.push(`Лучший канал «${best.channel}»: CR ${pct(best.cr)} — масштабировать.`);
    }
    if (worst.channel !== best.channel && worst.cr < REPORT_BENCHMARKS.crBad) {
      bad.push(
        `Канал «${worst.channel}»: CR ${pct(worst.cr)} при ${worst.visits} визитах — проверить качество.`,
      );
    }
  }

  // Entry pages with high bounce.
  const highBounce = s.breakdowns.entryPages.filter(
    (p) => p.visits >= REPORT_BENCHMARKS.minVisits && p.bounceRate >= REPORT_BENCHMARKS.bounceBad,
  );
  for (const p of highBounce.slice(0, 2)) {
    bad.push(`Страница входа ${p.page}: отказы ${pct(p.bounceRate)} — упростить первый экран.`);
  }

  // KPI gap (paid tickets).
  if (s.kpi.gap <= 0) {
    good.push(`Цель ${s.kpi.target} оплаченных билетов достигнута.`);
  } else {
    bad.push(
      `До цели ${s.kpi.target} не хватает ${s.kpi.gap} оплаченных билетов (оплачено ${s.kpi.b2bPaidTickets}).`,
    );
  }

  if (good.length === 0) good.push('Явных сильных сторон по порогам не выявлено.');
  if (bad.length === 0) bad.push('Явных проблем по порогам не выявлено.');
  return { good, bad };
}
