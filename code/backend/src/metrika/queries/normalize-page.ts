import type { PageStat } from '@pca/shared';

/**
 * Canonicalise a page URL so trailing-slash / host-case variants collapse to one key
 * (e.g. `https://productcamp.ru/` and `https://productcamp.ru` → same page). Query string and
 * fragment are dropped. Non-URL values (e.g. the «(none)» bucket) are returned trimmed (C-005).
 */
export function normalizePageUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${u.host.toLowerCase()}${path}`;
  } catch {
    return url.trim();
  }
}

/**
 * Merge per-page rows that canonicalise to the same URL: visits/users/goalReaches are summed and
 * bounce/conversion rates are visit-weighted. Mirrors the channel aggregation (v2.6.0) and is
 * required because `page_stats` upserts with INSERT OR REPLACE — without merging, the second URL
 * variant would overwrite the first instead of adding to it.
 */
export function aggregatePages(stats: readonly PageStat[]): PageStat[] {
  interface Acc {
    base: PageStat;
    visits: number;
    users: number;
    goalReaches: number;
    bounceWeighted: number;
    crWeighted: number;
  }
  const map = new Map<string, Acc>();
  for (const s of stats) {
    const page = normalizePageUrl(s.page);
    const cur = map.get(page);
    if (cur) {
      cur.visits += s.visits;
      cur.users += s.users;
      cur.goalReaches += s.goalReaches;
      cur.bounceWeighted += s.bounceRate * s.visits;
      cur.crWeighted += s.conversionRate * s.visits;
    } else {
      map.set(page, {
        base: { ...s, page },
        visits: s.visits,
        users: s.users,
        goalReaches: s.goalReaches,
        bounceWeighted: s.bounceRate * s.visits,
        crWeighted: s.conversionRate * s.visits,
      });
    }
  }
  return [...map.values()].map((a) => ({
    ...a.base,
    visits: a.visits,
    users: a.users,
    goalReaches: a.goalReaches,
    bounceRate: a.visits > 0 ? a.bounceWeighted / a.visits : 0,
    conversionRate: a.visits > 0 ? a.crWeighted / a.visits : 0,
  }));
}
