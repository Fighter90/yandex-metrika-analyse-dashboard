import type { GeoDeviceStat } from '@pca/shared';

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
