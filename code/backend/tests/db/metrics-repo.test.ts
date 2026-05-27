import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DB } from '../../src/db/connection';
import { MetricsRepo } from '../../src/db/repositories/metrics-repo';
import { freshDb } from './helpers';
import type { ChannelStat, GeoDeviceStat, Goal, PageStat, UtmStat } from '@pca/shared';

let db: DB;
let repo: MetricsRepo;

beforeEach(() => {
  db = freshDb();
  repo = new MetricsRepo(db);
});
afterEach(() => db.close());

const goal = (id: number, over: Partial<Goal> = {}): Goal => ({
  id,
  name: `goal ${id}`,
  type: 'form',
  isB2b: false,
  isArchived: false,
  syncedAt: '2025-01-01T00:00:00.000Z',
  ...over,
});

const stat = (date: string, over: Partial<ChannelStat> = {}): ChannelStat => ({
  date,
  channel: 'podcast',
  utmSource: 'podcast',
  utmMedium: 'audio',
  utmCampaign: 'ep1',
  visits: 100,
  users: 90,
  bounceRate: 0.2,
  avgDuration: 65,
  goalReaches: 5,
  conversionRate: 0.05,
  ...over,
});

describe('MetricsRepo — goals', () => {
  it('upserts and lists goals, hiding archived by default', () => {
    repo.upsertGoals([goal(80), goal(10, { isArchived: true, isB2b: true })]);
    expect(repo.listGoals().map((g) => g.id)).toEqual([80]);
    const all = repo.listGoals(true);
    expect(all.map((g) => g.id)).toEqual([10, 80]);
    expect(all.find((g) => g.id === 10)?.isB2b).toBe(true);
    expect(all.find((g) => g.id === 10)?.isArchived).toBe(true);
  });
});

describe('MetricsRepo — raw responses', () => {
  it('saves and reads back a raw response', () => {
    const id = repo.saveRawResponse({
      endpoint: '/stat/v1/data',
      queryHash: 'h1',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-01',
      payload: { rows: [1, 2, 3] },
      fetchedAt: '2025-01-02T00:00:00.000Z',
    });
    const got = repo.getRawResponse(id);
    expect(got?.payload).toEqual({ rows: [1, 2, 3] });
    expect(got?.queryHash).toBe('h1');
  });

  it('upserts on the (query_hash, date_from, date_to) conflict, keeping the same id', () => {
    const base = { endpoint: '/x', queryHash: 'h', dateFrom: '2025-01-01', dateTo: '2025-01-01' };
    const id1 = repo.saveRawResponse({ ...base, payload: { v: 1 }, fetchedAt: 't1' });
    const id2 = repo.saveRawResponse({ ...base, payload: { v: 2 }, fetchedAt: 't2' });
    expect(id2).toBe(id1);
    expect(repo.getRawResponse(id1)?.payload).toEqual({ v: 2 });
  });

  it('returns undefined for a missing raw response', () => {
    expect(repo.getRawResponse(999)).toBeUndefined();
  });
});

describe('MetricsRepo — channel stats', () => {
  it('upserts and lists channel stats, optionally filtered by date range', () => {
    repo.upsertChannelStats([
      stat('2025-01-01'),
      stat('2025-01-02', {
        channel: 'direct',
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
      }),
      stat('2025-01-03'),
    ]);
    expect(repo.listChannelStats()).toHaveLength(3);
    const ranged = repo.listChannelStats({ from: '2025-01-02', to: '2025-01-03' });
    expect(ranged.map((c) => c.date)).toEqual(['2025-01-02', '2025-01-03']);
    expect(ranged[0]?.utmSource).toBeNull();
  });
});

const utm = (date: string, over: Partial<UtmStat> = {}): UtmStat => ({
  date,
  utmSource: 'vk',
  utmMedium: 'cpc',
  utmCampaign: 'spring',
  visits: 100,
  users: 90,
  goalReaches: 7,
  conversionRate: 0.07,
  ...over,
});

describe('MetricsRepo — UTM stats', () => {
  it('upserts and lists UTM stats, optionally filtered by date range', () => {
    repo.upsertUtmStats([
      utm('2025-01-01'),
      utm('2025-01-02', { utmCampaign: 'summer' }),
      utm('2025-01-03'),
    ]);
    expect(repo.listUtmStats()).toHaveLength(3);
    const ranged = repo.listUtmStats({ from: '2025-01-02', to: '2025-01-03' });
    expect(ranged.map((u) => u.date)).toEqual(['2025-01-02', '2025-01-03']);
    expect(ranged[0]?.utmCampaign).toBe('summer');
    expect(ranged[0]?.goalReaches).toBe(7);
  });

  it('replaces a row on the composite-key conflict', () => {
    repo.upsertUtmStats([utm('2025-01-01', { visits: 100 })]);
    repo.upsertUtmStats([utm('2025-01-01', { visits: 250 })]);
    const rows = repo.listUtmStats();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.visits).toBe(250);
  });
});

const geo = (date: string, over: Partial<GeoDeviceStat> = {}): GeoDeviceStat => ({
  date,
  country: 'Россия',
  device: 'mobile',
  visits: 100,
  users: 90,
  goalReaches: 6,
  conversionRate: 0.06,
  ...over,
});

describe('MetricsRepo — geo/device stats', () => {
  it('upserts and lists geo/device stats, optionally filtered by date range', () => {
    repo.upsertGeoDeviceStats([
      geo('2025-01-01'),
      geo('2025-01-02', { device: 'desktop' }),
      geo('2025-01-03'),
    ]);
    expect(repo.listGeoDeviceStats()).toHaveLength(3);
    const ranged = repo.listGeoDeviceStats({ from: '2025-01-02', to: '2025-01-03' });
    expect(ranged.map((g) => g.date)).toEqual(['2025-01-02', '2025-01-03']);
    expect(ranged[0]?.device).toBe('desktop');
    expect(ranged[0]?.goalReaches).toBe(6);
  });
});

const page = (date: string, over: Partial<PageStat> = {}): PageStat => ({
  date,
  page: '/lp',
  visits: 100,
  users: 90,
  bounceRate: 0.3,
  goalReaches: 5,
  conversionRate: 0.05,
  ...over,
});

describe('MetricsRepo — page stats', () => {
  it('upserts and lists page stats, optionally filtered by date range', () => {
    repo.upsertPageStats([
      page('2025-01-01'),
      page('2025-01-02', { page: '/pricing' }),
      page('2025-01-03'),
    ]);
    expect(repo.listPageStats()).toHaveLength(3);
    const ranged = repo.listPageStats({ from: '2025-01-02', to: '2025-01-03' });
    expect(ranged.map((p) => p.date)).toEqual(['2025-01-02', '2025-01-03']);
    expect(ranged[0]?.page).toBe('/pricing');
    expect(ranged[0]?.bounceRate).toBe(0.3);
  });
});

describe('MetricsRepo — exit-page stats', () => {
  it('upserts and lists exit-page stats independently of entry pages', () => {
    repo.upsertPageStats([page('2025-01-01', { page: '/lp' })]);
    repo.upsertExitPageStats([
      page('2025-01-01', { page: '/checkout', bounceRate: 0.6 }),
      page('2025-01-02', { page: '/pricing' }),
    ]);
    // entry-page table is untouched by exit-page writes
    expect(repo.listPageStats()).toHaveLength(1);
    const exits = repo.listExitPageStats();
    expect(exits).toHaveLength(2);
    expect(exits[0]?.page).toBe('/checkout');
    expect(exits[0]?.bounceRate).toBe(0.6);
    const ranged = repo.listExitPageStats({ from: '2025-01-02', to: '2025-01-03' });
    expect(ranged.map((p) => p.page)).toEqual(['/pricing']);
  });
});

describe('MetricsRepo — clearDerivedStats', () => {
  it('wipes the 5 derived stat tables but keeps goals and raw_responses', () => {
    repo.upsertChannelStats([stat('2025-01-01')]);
    repo.upsertUtmStats([utm('2025-01-01')]);
    repo.upsertGeoDeviceStats([geo('2025-01-01')]);
    repo.upsertPageStats([page('2025-01-01', { page: '/lp' })]);
    repo.upsertExitPageStats([page('2025-01-01', { page: '/checkout' })]);
    repo.upsertGoals([goal(100)]);
    const rawId = repo.saveRawResponse({
      endpoint: '/stat/v1/data',
      queryHash: 'clr',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-01',
      payload: { ok: true },
      fetchedAt: 't1',
    });

    repo.clearDerivedStats();

    expect(repo.listChannelStats()).toHaveLength(0);
    expect(repo.listUtmStats()).toHaveLength(0);
    expect(repo.listGeoDeviceStats()).toHaveLength(0);
    expect(repo.listPageStats()).toHaveLength(0);
    expect(repo.listExitPageStats()).toHaveLength(0);
    // audit trail + goals are NOT cleared
    expect(repo.listGoals()).toHaveLength(1);
    expect(repo.getRawResponse(rawId)).toBeDefined();
  });
});
