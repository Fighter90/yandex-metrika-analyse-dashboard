import type { PageStat } from '@pca/shared';
import { intTooltip } from './echart-format';

export interface PageRow {
  readonly page: string;
  readonly visits: number;
  readonly users: number;
  readonly bounceRate: number;
  readonly goalReaches: number;
  readonly conversionRate: number;
}

/**
 * Aggregate entry-page stats (per-day) by page, highest visits first. bounceRate is visit-weighted
 * across days; conversionRate = reaches / visits. Pure so it is fully unit-testable.
 */
export function pageRows(stats: PageStat[]): PageRow[] {
  const map = new Map<
    string,
    { visits: number; users: number; goalReaches: number; bounceVisits: number }
  >();
  for (const s of stats) {
    const cur = map.get(s.page) ?? { visits: 0, users: 0, goalReaches: 0, bounceVisits: 0 };
    map.set(s.page, {
      visits: cur.visits + s.visits,
      users: cur.users + s.users,
      goalReaches: cur.goalReaches + s.goalReaches,
      bounceVisits: cur.bounceVisits + s.bounceRate * s.visits,
    });
  }
  return [...map.entries()]
    .map(([page, v]) => ({
      page,
      visits: v.visits,
      users: v.users,
      goalReaches: v.goalReaches,
      bounceRate: v.visits === 0 ? 0 : v.bounceVisits / v.visits,
      conversionRate: v.visits === 0 ? 0 : v.goalReaches / v.visits,
    }))
    .sort((a, b) => b.visits - a.visits);
}

/** Shorten a URL to its path for chart labels (drops scheme + host). */
function shortLabel(page: string): string {
  const path = page.replace(/^https?:\/\/[^/]+/, '');
  return path === '' ? '/' : path;
}

/** ECharts horizontal bar: visits per page (top 8), with visits + reaches series. */
export function pageBarOption(rows: PageRow[], title: string): object {
  const top = rows.slice(0, 8).reverse();
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis', ...intTooltip },
    legend: { data: ['Визиты', 'Заявки'], bottom: 0 },
    grid: { left: 140, right: 16, top: 32, bottom: 28 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: top.map((r) => shortLabel(r.page)) },
    series: [
      { name: 'Визиты', type: 'bar', data: top.map((r) => r.visits) },
      { name: 'Заявки', type: 'bar', data: top.map((r) => r.goalReaches) },
    ],
  };
}
