import type { GeoDeviceStat } from '@pca/shared';
import { intTooltip, intBarLabel } from './echart-format';

export interface AudienceRow {
  readonly label: string;
  readonly visits: number;
  readonly users: number;
  readonly goalReaches: number;
  readonly conversionRate: number;
}

/** Aggregate geo/device stats by one dimension, highest visits first; CR = reaches / visits. */
function aggregateBy(stats: GeoDeviceStat[], pick: (s: GeoDeviceStat) => string): AudienceRow[] {
  const map = new Map<string, { visits: number; users: number; goalReaches: number }>();
  for (const s of stats) {
    const key = pick(s);
    const cur = map.get(key) ?? { visits: 0, users: 0, goalReaches: 0 };
    map.set(key, {
      visits: cur.visits + s.visits,
      users: cur.users + s.users,
      goalReaches: cur.goalReaches + s.goalReaches,
    });
  }
  return [...map.entries()]
    .map(([label, v]) => ({
      label,
      visits: v.visits,
      users: v.users,
      goalReaches: v.goalReaches,
      conversionRate: v.visits === 0 ? 0 : v.goalReaches / v.visits,
    }))
    .sort((a, b) => b.visits - a.visits);
}

/** Rows aggregated by country. */
export function byCountry(stats: GeoDeviceStat[]): AudienceRow[] {
  return aggregateBy(stats, (s) => s.country);
}

/** Rows aggregated by device category. */
export function byDevice(stats: GeoDeviceStat[]): AudienceRow[] {
  return aggregateBy(stats, (s) => s.device);
}

/** ECharts horizontal bar: visits per label (top rows already sorted desc). */
export function audienceBarOption(rows: AudienceRow[], title: string): object {
  const top = rows.slice(0, 8).reverse(); // reverse → largest at top of a horizontal bar
  return {
    title: { text: title, left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'axis', ...intTooltip },
    grid: { left: 120, right: 16, top: 32, bottom: 24 },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: top.map((r) => r.label) },
    series: [{ type: 'bar', data: top.map((r) => r.visits), label: intBarLabel('right') }],
  };
}

/** ECharts donut: share of visits by device category. */
export function deviceShareOption(rows: AudienceRow[]): object {
  return {
    title: { text: 'Доля устройств (визиты)', left: 'center', textStyle: { fontSize: 13 } },
    tooltip: { trigger: 'item', ...intTooltip },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: rows.map((r) => ({ name: r.label, value: r.visits })),
      },
    ],
  };
}
