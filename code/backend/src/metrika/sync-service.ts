import { selectPrimaryGoal, type Goal } from '@pca/shared';
import type { MetricsRepo } from '../db/repositories/metrics-repo';
import { dayChunks } from '../utils/date-range';
import { stableHash } from '../utils/hash';
import type { MetrikaClient } from './client';
import { ENDPOINTS } from './endpoints';
import { GoalsResponseSchema } from './schemas';
import { trafficBySource } from './queries/traffic-by-source';
import { utmBreakdown } from './queries/utm-breakdown';
import { geoDeviceBreakdown } from './queries/geo-device-breakdown';
import { pageBehavior } from './queries/page-behavior';
import { exitPageBehavior } from './queries/exit-page-behavior';

export interface SyncDeps {
  readonly client: MetrikaClient;
  readonly metrics: MetricsRepo;
  readonly counterId: number;
  /** Goals with id below this threshold are flagged archived (§5.5). */
  readonly archivedThreshold: number;
  /** ISO timestamp source (injectable for deterministic tests). */
  readonly now: () => string;
}

export interface SyncSummary {
  readonly goals: number;
  /**
   * The goal id whose reaches were synced. Either the explicit goalId passed in, or — when none was
   * given — the primary KPI goal auto-detected from the goals list ({@link selectPrimaryGoal}), or
   * undefined if neither applies (no KPI-looking goal found → goal metrics skipped).
   */
  readonly resolvedGoalId: number | undefined;
  readonly days: number;
  readonly channelRows: number;
  readonly utmRows: number;
  readonly geoDeviceRows: number;
  readonly pageRows: number;
  readonly exitPageRows: number;
}

/** Pulls Metrika data into SQLite: raw responses (for traceability) + derived channel stats. */
export class SyncService {
  constructor(private readonly deps: SyncDeps) {}

  /** Fetch + map goals from the API without persisting — lets callers validate auth before any write. */
  private async fetchGoals(): Promise<Goal[]> {
    const res = await this.deps.client.get(
      ENDPOINTS.goals(this.deps.counterId),
      {},
      GoalsResponseSchema,
    );
    return res.goals.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      isB2b: false,
      isArchived: g.id < this.deps.archivedThreshold,
      syncedAt: this.deps.now(),
    }));
  }

  async syncGoals(): Promise<Goal[]> {
    const goals = await this.fetchGoals();
    this.deps.metrics.upsertGoals(goals);
    return goals;
  }

  async syncTraffic(
    from: string,
    to: string,
    goalId?: number,
  ): Promise<{ days: number; rows: number }> {
    const chunks = dayChunks(from, to);
    let rows = 0;
    for (const chunk of chunks) {
      const { raw, stats } = await trafficBySource(this.deps.client, {
        counterId: this.deps.counterId,
        from: chunk.from,
        to: chunk.to,
        goalId,
      });
      this.deps.metrics.saveRawResponse({
        endpoint: ENDPOINTS.statData,
        queryHash: stableHash({ q: 'traffic-by-source', goalId, from: chunk.from, to: chunk.to }),
        dateFrom: chunk.from,
        dateTo: chunk.to,
        payload: raw,
        fetchedAt: this.deps.now(),
      });
      this.deps.metrics.upsertChannelStats(stats);
      rows += stats.length;
    }
    return { days: chunks.length, rows };
  }

  async syncUtm(from: string, to: string, goalId?: number): Promise<{ rows: number }> {
    const chunks = dayChunks(from, to);
    let rows = 0;
    for (const chunk of chunks) {
      const { raw, stats } = await utmBreakdown(this.deps.client, {
        counterId: this.deps.counterId,
        from: chunk.from,
        to: chunk.to,
        goalId,
      });
      this.deps.metrics.saveRawResponse({
        endpoint: ENDPOINTS.statData,
        queryHash: stableHash({ q: 'utm-breakdown', goalId, from: chunk.from, to: chunk.to }),
        dateFrom: chunk.from,
        dateTo: chunk.to,
        payload: raw,
        fetchedAt: this.deps.now(),
      });
      this.deps.metrics.upsertUtmStats(stats);
      rows += stats.length;
    }
    return { rows };
  }

  async syncGeoDevice(from: string, to: string, goalId?: number): Promise<{ rows: number }> {
    const chunks = dayChunks(from, to);
    let rows = 0;
    for (const chunk of chunks) {
      const { raw, stats } = await geoDeviceBreakdown(this.deps.client, {
        counterId: this.deps.counterId,
        from: chunk.from,
        to: chunk.to,
        goalId,
      });
      this.deps.metrics.saveRawResponse({
        endpoint: ENDPOINTS.statData,
        queryHash: stableHash({ q: 'geo-device', goalId, from: chunk.from, to: chunk.to }),
        dateFrom: chunk.from,
        dateTo: chunk.to,
        payload: raw,
        fetchedAt: this.deps.now(),
      });
      this.deps.metrics.upsertGeoDeviceStats(stats);
      rows += stats.length;
    }
    return { rows };
  }

  async syncPages(from: string, to: string, goalId?: number): Promise<{ rows: number }> {
    const chunks = dayChunks(from, to);
    let rows = 0;
    for (const chunk of chunks) {
      const { raw, stats } = await pageBehavior(this.deps.client, {
        counterId: this.deps.counterId,
        from: chunk.from,
        to: chunk.to,
        goalId,
      });
      this.deps.metrics.saveRawResponse({
        endpoint: ENDPOINTS.statData,
        queryHash: stableHash({ q: 'page-behavior', goalId, from: chunk.from, to: chunk.to }),
        dateFrom: chunk.from,
        dateTo: chunk.to,
        payload: raw,
        fetchedAt: this.deps.now(),
      });
      this.deps.metrics.upsertPageStats(stats);
      rows += stats.length;
    }
    return { rows };
  }

  async syncExitPages(from: string, to: string, goalId?: number): Promise<{ rows: number }> {
    const chunks = dayChunks(from, to);
    let rows = 0;
    for (const chunk of chunks) {
      const { raw, stats } = await exitPageBehavior(this.deps.client, {
        counterId: this.deps.counterId,
        from: chunk.from,
        to: chunk.to,
        goalId,
      });
      this.deps.metrics.saveRawResponse({
        endpoint: ENDPOINTS.statData,
        queryHash: stableHash({ q: 'exit-page-behavior', goalId, from: chunk.from, to: chunk.to }),
        dateFrom: chunk.from,
        dateTo: chunk.to,
        payload: raw,
        fetchedAt: this.deps.now(),
      });
      this.deps.metrics.upsertExitPageStats(stats);
      rows += stats.length;
    }
    return { rows };
  }

  /**
   * Run an optional breakdown sync best-effort: a counter-specific failure (an attribute the API
   * rejects, an unavailable goal) is logged and skipped rather than aborting the whole pipeline,
   * so the dashboard still gets every dataset that IS available. Goals + traffic stay required.
   */
  private async best(
    label: string,
    fn: () => Promise<{ rows: number }>,
  ): Promise<{ rows: number }> {
    try {
      return await fn();
    } catch (err) {
      console.warn(`[sync] ${label} skipped: ${(err as Error).message}`);
      return { rows: 0 };
    }
  }

  async syncAll(from: string, to: string, goalId?: number): Promise<SyncSummary> {
    // Validate connectivity + auth with the (required) goals call BEFORE wiping anything, so a
    // failed sync (e.g. expired token) leaves the existing dataset intact instead of an empty DB.
    const goals = await this.fetchGoals();
    // Full wipe of all synced data (stat tables + goals + raw_responses) before reloading so a
    // re-sync always yields a fresh, duplicate-free dataset. SQLite treats NULL as distinct in the
    // (date, channel, utm_*) primary key, so INSERT OR REPLACE cannot dedupe rows with NULL UTM —
    // a full wipe+reload is the reliable guarantee. User-entered data (b2b/hypotheses/decisions/
    // snapshots) is preserved.
    this.deps.metrics.resetSyncedData();
    this.deps.metrics.upsertGoals(goals);
    // Auto-detect the KPI goal when the caller didn't pin one — so the user never hand-picks a
    // GOAL_ID. An explicit goalId always wins; otherwise pick the payment/purchase goal.
    const resolvedGoalId = goalId ?? selectPrimaryGoal(goals)?.id;
    const { days, rows } = await this.syncTraffic(from, to, resolvedGoalId);
    const utm = await this.best('utm', () => this.syncUtm(from, to, resolvedGoalId));
    const geo = await this.best('geo-device', () => this.syncGeoDevice(from, to, resolvedGoalId));
    const pages = await this.best('pages', () => this.syncPages(from, to, resolvedGoalId));
    const exitPages = await this.best('exit-pages', () =>
      this.syncExitPages(from, to, resolvedGoalId),
    );
    return {
      goals: goals.length,
      resolvedGoalId,
      days,
      channelRows: rows,
      utmRows: utm.rows,
      geoDeviceRows: geo.rows,
      pageRows: pages.rows,
      exitPageRows: exitPages.rows,
    };
  }
}
