import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DB } from '../../src/db/connection';
import { MetricsRepo } from '../../src/db/repositories/metrics-repo';
import { HypothesesRepo } from '../../src/db/repositories/hypotheses-repo';
import { DecisionsRepo } from '../../src/db/repositories/decisions-repo';
import { B2bRepo } from '../../src/db/repositories/b2b-repo';
import { SnapshotBuilder } from '../../src/report/snapshot-builder';
import { freshDb, validHypothesis } from '../db/helpers';

let db: DB;
let builder: SnapshotBuilder;
let metrics: MetricsRepo;

beforeEach(() => {
  db = freshDb();
  metrics = new MetricsRepo(db);
  const hypotheses = new HypothesesRepo(db);
  const b2b = new B2bRepo(db);
  builder = new SnapshotBuilder({ metrics, hypotheses, decisions: new DecisionsRepo(db), b2b });

  metrics.upsertChannelStats([
    {
      date: '2025-01-02',
      channel: 'podcast',
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      visits: 100,
      users: 90,
      bounceRate: 0.2,
      avgDuration: 60,
      goalReaches: 7,
      conversionRate: 0.07,
    },
  ]);
  metrics.upsertUtmStats([
    {
      date: '2025-01-02',
      utmSource: 'vk',
      utmMedium: 'cpc',
      utmCampaign: 'spring',
      visits: 80,
      users: 70,
      goalReaches: 4,
      conversionRate: 0.05,
    },
  ]);
  metrics.upsertGeoDeviceStats([
    {
      date: '2025-01-02',
      country: 'Россия',
      device: 'mobile',
      visits: 60,
      users: 55,
      goalReaches: 3,
      conversionRate: 0.05,
    },
  ]);
  metrics.upsertPageStats([
    {
      date: '2025-01-02',
      page: '/lp',
      visits: 70,
      users: 60,
      bounceRate: 0.25,
      goalReaches: 4,
      conversionRate: 0.05,
    },
  ]);
  metrics.upsertExitPageStats([
    {
      date: '2025-01-02',
      page: '/checkout',
      visits: 40,
      users: 35,
      bounceRate: 0.6,
      goalReaches: 2,
      conversionRate: 0.05,
    },
  ]);
  hypotheses.create(validHypothesis({ kind: 'problem' }));
  hypotheses.create(validHypothesis({ kind: 'solution', diamondPhase: 'develop' }));
  b2b.create({ company: 'BigCorp', tickets: 20, stage: 'paid', dateAdded: '2025-01-01' });
  b2b.create({ company: 'SmallCo', tickets: 3, stage: 'lead', dateAdded: '2025-01-01' });
});
afterEach(() => db.close());

describe('SnapshotBuilder', () => {
  it('assembles KPI, channels, hypotheses split and decisions from the DB', () => {
    const snap = builder.build({
      id: 'snap-1',
      generatedAt: 'T',
      from: '2025-01-01',
      to: '2025-01-07',
    });
    expect(snap.id).toBe('snap-1');
    expect(snap.kpi).toEqual({ target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 });
    expect(snap.channels).toHaveLength(1);
    expect(snap.hypotheses.problems).toHaveLength(1);
    expect(snap.hypotheses.solutions).toHaveLength(1);
    expect(snap.period).toEqual({ from: '2025-01-01', to: '2025-01-07' });
  });

  it('includes top breakdowns (UTM, geo/device, entry + exit pages) for the period', () => {
    const snap = builder.build({ id: 's', generatedAt: 'T', from: '2025-01-01', to: '2025-01-07' });
    expect(snap.breakdowns.utm[0]).toMatchObject({ source: 'vk', visits: 80 });
    expect(snap.breakdowns.geoDevice[0]).toMatchObject({ country: 'Россия', device: 'mobile' });
    expect(snap.breakdowns.entryPages[0]).toMatchObject({ page: '/lp', visits: 70 });
    expect(snap.breakdowns.exitPages[0]).toMatchObject({ page: '/checkout', visits: 40 });
  });

  it('is deterministic — same inputs + data yield an identical snapshot', () => {
    const opts = { id: 'x', generatedAt: 'T', from: '2025-01-01', to: '2025-01-07' };
    expect(JSON.stringify(builder.build(opts))).toBe(JSON.stringify(builder.build(opts)));
  });

  it('excludes channel rows outside the requested period', () => {
    const snap = builder.build({ id: 'x', generatedAt: 'T', from: '2025-02-01', to: '2025-02-07' });
    expect(snap.channels).toHaveLength(0);
    expect(snap.kpi.b2cApplications).toBe(0);
  });

  it('includes b2bSummary with deals, totals and byStage breakdown', () => {
    const snap = builder.build({ id: 'x', generatedAt: 'T', from: '2025-01-01', to: '2025-01-07' });
    expect(snap.b2bSummary.totalTickets).toBe(23);
    expect(snap.b2bSummary.paidTickets).toBe(20);
    expect(snap.b2bSummary.dealsCount).toBe(2);
    expect(snap.b2bSummary.deals).toHaveLength(2);
    expect(snap.b2bSummary.byStage).toHaveLength(2);
  });

  it('includes funnel data (visits → applications → B2B pipeline → B2B paid)', () => {
    const snap = builder.build({ id: 'x', generatedAt: 'T', from: '2025-01-01', to: '2025-01-07' });
    expect(snap.funnel.visits).toBe(100);
    expect(snap.funnel.b2cApplications).toBe(7);
    expect(snap.funnel.b2bPipelineTickets).toBe(3);
    expect(snap.funnel.b2bPaidTickets).toBe(20);
  });
});
