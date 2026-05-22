import type { Goal } from '@pca/shared';
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

  async syncGoals(): Promise<number> {
    const res = await this.deps.client.get(
      ENDPOINTS.goals(this.deps.counterId),
      {},
      GoalsResponseSchema,
    );
    const goals: Goal[] = res.goals.map((g) => ({
      id: g.id,
      name: g.name,
      type: g.type,
      isB2b: false,
      isArchived: g.id < this.deps.archivedThreshold,
      syncedAt: this.deps.now(),
    }));
    this.deps.metrics.upsertGoals(goals);
    return goals.length;
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

  async syncAll(from: string, to: string, goalId?: number): Promise<SyncSummary> {
    const goals = await this.syncGoals();
    const { days, rows } = await this.syncTraffic(from, to, goalId);
    const utm = await this.syncUtm(from, to, goalId);
    const geo = await this.syncGeoDevice(from, to, goalId);
    const pages = await this.syncPages(from, to, goalId);
    const exitPages = await this.syncExitPages(from, to, goalId);
    return {
      goals,
      days,
      channelRows: rows,
      utmRows: utm.rows,
      geoDeviceRows: geo.rows,
      pageRows: pages.rows,
      exitPageRows: exitPages.rows,
    };
  }
}
