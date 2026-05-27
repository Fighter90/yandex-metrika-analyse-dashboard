import type { DB } from '../connection';
import type {
  ChannelStat,
  GeoDeviceStat,
  Goal,
  NewRawResponse,
  PageStat,
  RawResponse,
  UtmStat,
} from '@pca/shared';

interface GoalRow {
  id: number;
  name: string;
  type: string;
  is_b2b: number;
  is_archived: number;
  synced_at: string;
}

interface RawRow {
  id: number;
  endpoint: string;
  query_hash: string;
  date_from: string;
  date_to: string;
  payload: string;
  fetched_at: string;
}

interface ChannelRow {
  date: string;
  channel: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visits: number;
  users: number;
  bounce_rate: number;
  avg_duration: number;
  goal_reaches: number;
  conversion_rate: number;
}

interface UtmRow {
  date: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  visits: number;
  users: number;
  goal_reaches: number;
  conversion_rate: number;
}

function toUtmStat(r: UtmRow): UtmStat {
  return {
    date: r.date,
    utmSource: r.utm_source,
    utmMedium: r.utm_medium,
    utmCampaign: r.utm_campaign,
    visits: r.visits,
    users: r.users,
    goalReaches: r.goal_reaches,
    conversionRate: r.conversion_rate,
  };
}

interface GeoDeviceRow {
  date: string;
  country: string;
  device: string;
  visits: number;
  users: number;
  goal_reaches: number;
  conversion_rate: number;
}

function toGeoDeviceStat(r: GeoDeviceRow): GeoDeviceStat {
  return {
    date: r.date,
    country: r.country,
    device: r.device,
    visits: r.visits,
    users: r.users,
    goalReaches: r.goal_reaches,
    conversionRate: r.conversion_rate,
  };
}

interface PageRow {
  date: string;
  page: string;
  visits: number;
  users: number;
  bounce_rate: number;
  goal_reaches: number;
  conversion_rate: number;
}

function toPageStat(r: PageRow): PageStat {
  return {
    date: r.date,
    page: r.page,
    visits: r.visits,
    users: r.users,
    bounceRate: r.bounce_rate,
    goalReaches: r.goal_reaches,
    conversionRate: r.conversion_rate,
  };
}

function toGoal(r: GoalRow): Goal {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    isB2b: r.is_b2b === 1,
    isArchived: r.is_archived === 1,
    syncedAt: r.synced_at,
  };
}

function toChannelStat(r: ChannelRow): ChannelStat {
  return {
    date: r.date,
    channel: r.channel,
    utmSource: r.utm_source,
    utmMedium: r.utm_medium,
    utmCampaign: r.utm_campaign,
    visits: r.visits,
    users: r.users,
    bounceRate: r.bounce_rate,
    avgDuration: r.avg_duration,
    goalReaches: r.goal_reaches,
    conversionRate: r.conversion_rate,
  };
}

/** Repository for Metrika-derived data: goals, raw API responses, channel stats. */
export class MetricsRepo {
  constructor(private readonly db: DB) {}

  upsertGoals(goals: readonly Goal[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO goals (id, name, type, is_b2b, is_archived, synced_at)
       VALUES (@id, @name, @type, @is_b2b, @is_archived, @synced_at)`,
    );
    const tx = this.db.transaction((rows: readonly Goal[]) => {
      for (const g of rows) {
        stmt.run({
          id: g.id,
          name: g.name,
          type: g.type,
          is_b2b: g.isB2b ? 1 : 0,
          is_archived: g.isArchived ? 1 : 0,
          synced_at: g.syncedAt,
        });
      }
    });
    tx(goals);
  }

  listGoals(includeArchived = false): Goal[] {
    const sql = includeArchived
      ? 'SELECT * FROM goals ORDER BY id'
      : 'SELECT * FROM goals WHERE is_archived = 0 ORDER BY id';
    return (this.db.prepare(sql).all() as GoalRow[]).map(toGoal);
  }

  /** Idempotent cache write keyed by (query_hash, date_from, date_to). Returns the row id. */
  saveRawResponse(r: NewRawResponse): number {
    const row = this.db
      .prepare(
        `INSERT INTO raw_responses (endpoint, query_hash, date_from, date_to, payload, fetched_at)
         VALUES (@endpoint, @query_hash, @date_from, @date_to, @payload, @fetched_at)
         ON CONFLICT(query_hash, date_from, date_to) DO UPDATE SET
           endpoint = excluded.endpoint,
           payload = excluded.payload,
           fetched_at = excluded.fetched_at
         RETURNING id`,
      )
      .get({
        endpoint: r.endpoint,
        query_hash: r.queryHash,
        date_from: r.dateFrom,
        date_to: r.dateTo,
        payload: JSON.stringify(r.payload),
        fetched_at: r.fetchedAt,
      }) as { id: number };
    return row.id;
  }

  getRawResponse(id: number): RawResponse | undefined {
    const r = this.db.prepare('SELECT * FROM raw_responses WHERE id = ?').get(id) as
      | RawRow
      | undefined;
    if (!r) return undefined;
    return {
      id: r.id,
      endpoint: r.endpoint,
      queryHash: r.query_hash,
      dateFrom: r.date_from,
      dateTo: r.date_to,
      payload: JSON.parse(r.payload),
      fetchedAt: r.fetched_at,
    };
  }

  /**
   * Wipe all derived per-period stat tables (kept idempotent for re-sync — see syncAll). Does NOT
   * touch raw_responses (audit trail), goals, B2B, hypotheses or decisions.
   */
  clearDerivedStats(): void {
    const tables = [
      'channel_stats',
      'utm_stats',
      'geo_device_stats',
      'page_stats',
      'exit_page_stats',
    ];
    const tx = this.db.transaction(() => {
      for (const t of tables) this.db.prepare(`DELETE FROM ${t}`).run();
    });
    tx();
  }

  upsertChannelStats(rows: readonly ChannelStat[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO channel_stats
         (date, channel, utm_source, utm_medium, utm_campaign, visits, users,
          bounce_rate, avg_duration, goal_reaches, conversion_rate)
       VALUES (@date, @channel, @utm_source, @utm_medium, @utm_campaign, @visits, @users,
          @bounce_rate, @avg_duration, @goal_reaches, @conversion_rate)`,
    );
    const tx = this.db.transaction((items: readonly ChannelStat[]) => {
      for (const c of items) {
        stmt.run({
          date: c.date,
          channel: c.channel,
          utm_source: c.utmSource,
          utm_medium: c.utmMedium,
          utm_campaign: c.utmCampaign,
          visits: c.visits,
          users: c.users,
          bounce_rate: c.bounceRate,
          avg_duration: c.avgDuration,
          goal_reaches: c.goalReaches,
          conversion_rate: c.conversionRate,
        });
      }
    });
    tx(rows);
  }

  listChannelStats(range?: { from: string; to: string }): ChannelStat[] {
    const rows = range
      ? (this.db
          .prepare('SELECT * FROM channel_stats WHERE date >= ? AND date <= ? ORDER BY date')
          .all(range.from, range.to) as ChannelRow[])
      : (this.db.prepare('SELECT * FROM channel_stats ORDER BY date').all() as ChannelRow[]);
    return rows.map(toChannelStat);
  }

  upsertUtmStats(rows: readonly UtmStat[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO utm_stats
         (date, utm_source, utm_medium, utm_campaign, visits, users, goal_reaches, conversion_rate)
       VALUES (@date, @utm_source, @utm_medium, @utm_campaign, @visits, @users,
          @goal_reaches, @conversion_rate)`,
    );
    const tx = this.db.transaction((items: readonly UtmStat[]) => {
      for (const u of items) {
        stmt.run({
          date: u.date,
          utm_source: u.utmSource,
          utm_medium: u.utmMedium,
          utm_campaign: u.utmCampaign,
          visits: u.visits,
          users: u.users,
          goal_reaches: u.goalReaches,
          conversion_rate: u.conversionRate,
        });
      }
    });
    tx(rows);
  }

  listUtmStats(range?: { from: string; to: string }): UtmStat[] {
    const rows = range
      ? (this.db
          .prepare('SELECT * FROM utm_stats WHERE date >= ? AND date <= ? ORDER BY date')
          .all(range.from, range.to) as UtmRow[])
      : (this.db.prepare('SELECT * FROM utm_stats ORDER BY date').all() as UtmRow[]);
    return rows.map(toUtmStat);
  }

  upsertGeoDeviceStats(rows: readonly GeoDeviceStat[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO geo_device_stats
         (date, country, device, visits, users, goal_reaches, conversion_rate)
       VALUES (@date, @country, @device, @visits, @users, @goal_reaches, @conversion_rate)`,
    );
    const tx = this.db.transaction((items: readonly GeoDeviceStat[]) => {
      for (const g of items) {
        stmt.run({
          date: g.date,
          country: g.country,
          device: g.device,
          visits: g.visits,
          users: g.users,
          goal_reaches: g.goalReaches,
          conversion_rate: g.conversionRate,
        });
      }
    });
    tx(rows);
  }

  listGeoDeviceStats(range?: { from: string; to: string }): GeoDeviceStat[] {
    const rows = range
      ? (this.db
          .prepare('SELECT * FROM geo_device_stats WHERE date >= ? AND date <= ? ORDER BY date')
          .all(range.from, range.to) as GeoDeviceRow[])
      : (this.db.prepare('SELECT * FROM geo_device_stats ORDER BY date').all() as GeoDeviceRow[]);
    return rows.map(toGeoDeviceStat);
  }

  upsertPageStats(rows: readonly PageStat[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO page_stats
         (date, page, visits, users, bounce_rate, goal_reaches, conversion_rate)
       VALUES (@date, @page, @visits, @users, @bounce_rate, @goal_reaches, @conversion_rate)`,
    );
    const tx = this.db.transaction((items: readonly PageStat[]) => {
      for (const p of items) {
        stmt.run({
          date: p.date,
          page: p.page,
          visits: p.visits,
          users: p.users,
          bounce_rate: p.bounceRate,
          goal_reaches: p.goalReaches,
          conversion_rate: p.conversionRate,
        });
      }
    });
    tx(rows);
  }

  listPageStats(range?: { from: string; to: string }): PageStat[] {
    const rows = range
      ? (this.db
          .prepare('SELECT * FROM page_stats WHERE date >= ? AND date <= ? ORDER BY date')
          .all(range.from, range.to) as PageRow[])
      : (this.db.prepare('SELECT * FROM page_stats ORDER BY date').all() as PageRow[]);
    return rows.map(toPageStat);
  }

  upsertExitPageStats(rows: readonly PageStat[]): void {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO exit_page_stats
         (date, page, visits, users, bounce_rate, goal_reaches, conversion_rate)
       VALUES (@date, @page, @visits, @users, @bounce_rate, @goal_reaches, @conversion_rate)`,
    );
    const tx = this.db.transaction((items: readonly PageStat[]) => {
      for (const p of items) {
        stmt.run({
          date: p.date,
          page: p.page,
          visits: p.visits,
          users: p.users,
          bounce_rate: p.bounceRate,
          goal_reaches: p.goalReaches,
          conversion_rate: p.conversionRate,
        });
      }
    });
    tx(rows);
  }

  listExitPageStats(range?: { from: string; to: string }): PageStat[] {
    const rows = range
      ? (this.db
          .prepare('SELECT * FROM exit_page_stats WHERE date >= ? AND date <= ? ORDER BY date')
          .all(range.from, range.to) as PageRow[])
      : (this.db.prepare('SELECT * FROM exit_page_stats ORDER BY date').all() as PageRow[]);
    return rows.map(toPageStat);
  }
}
