import {
  KPI_TARGET_PAID_TICKETS,
  selectPrimaryGoal,
  formatGoalLabel,
  type ReportSnapshot,
} from '@pca/shared';
import type { MetricsRepo } from '../db/repositories/metrics-repo';
import type { HypothesesRepo } from '../db/repositories/hypotheses-repo';
import type { DecisionsRepo } from '../db/repositories/decisions-repo';
import type { B2bRepo } from '../db/repositories/b2b-repo';
import { topUtm, topGeoDevice, topPages } from './breakdowns';

export interface SnapshotBuilderDeps {
  readonly metrics: MetricsRepo;
  readonly hypotheses: HypothesesRepo;
  readonly decisions: DecisionsRepo;
  readonly b2b: B2bRepo;
}

export interface BuildOptions {
  readonly id: string;
  readonly generatedAt: string;
  readonly from: string;
  readonly to: string;
}

export interface B2bSummary {
  readonly totalTickets: number;
  readonly paidTickets: number;
  readonly dealsCount: number;
  readonly deals: Array<{ company: string; tickets: number; stage: string }>;
  readonly byStage: Array<{ stage: string; tickets: number; deals: number }>;
}

function computeB2bSummary(b2b: ReturnType<B2bRepo['list']>): B2bSummary {
  const totalTickets = b2b.reduce((a, d) => a + d.tickets, 0);
  const paidTickets = b2b.filter((d) => d.stage === 'paid').reduce((a, d) => a + d.tickets, 0);
  const byStageMap = new Map<string, { tickets: number; deals: number }>();
  for (const d of b2b) {
    const cur = byStageMap.get(d.stage) ?? { tickets: 0, deals: 0 };
    byStageMap.set(d.stage, { tickets: cur.tickets + d.tickets, deals: cur.deals + 1 });
  }
  const byStage = [...byStageMap.entries()].map(([stage, v]) => ({
    stage,
    tickets: v.tickets,
    deals: v.deals,
  }));
  return {
    totalTickets,
    paidTickets,
    dealsCount: b2b.length,
    deals: b2b.map((d) => ({ company: d.company, tickets: d.tickets, stage: d.stage })),
    byStage,
  };
}

/**
 * Assembles an immutable ReportSnapshot purely from the cached DB — no live API calls,
 * no Date.now() (id + generatedAt are inputs), so the same data + inputs yield the same snapshot.
 */
export class SnapshotBuilder {
  constructor(private readonly deps: SnapshotBuilderDeps) {}

  build(opts: BuildOptions): ReportSnapshot {
    const range = { from: opts.from, to: opts.to };
    const channels = this.deps.metrics.listChannelStats(range);
    const utmStats = this.deps.metrics.listUtmStats(range);
    const geoDeviceStats = this.deps.metrics.listGeoDeviceStats(range);
    const pageStats = this.deps.metrics.listPageStats(range);
    const exitPageStats = this.deps.metrics.listExitPageStats(range);
    const all = this.deps.hypotheses.list();
    const decisions = this.deps.decisions.list();
    const b2b = this.deps.b2b.list();

    const b2cApplications = channels.reduce((acc, c) => acc + c.goalReaches, 0);
    const b2bPaidTickets = b2b
      .filter((d) => d.stage === 'paid')
      .reduce((acc, d) => acc + d.tickets, 0);
    const b2bSummary = computeB2bSummary(b2b);

    // Compute funnel: visits → reaches → B2B pipeline → B2B paid
    const totalVisits = channels.reduce((a, c) => a + c.visits, 0);
    const b2bPipelineTickets = b2b
      .filter((d) => d.stage !== 'paid')
      .reduce((a, d) => a + d.tickets, 0);

    // Label for the primary goal's reaches — «Оплат» for a purchase goal, else «Заявок B2C».
    const goalLabel = formatGoalLabel(selectPrimaryGoal(this.deps.metrics.listGoals(true)));
    // When the primary goal is a purchase goal, its reaches ARE payments and count toward the
    // 300-ticket target alongside B2B paid (matches the Goals page). Otherwise only B2B paid counts.
    const metrikaPaid = goalLabel.isPaid ? b2cApplications : 0;
    const gap = Math.max(0, KPI_TARGET_PAID_TICKETS - b2bPaidTickets - metrikaPaid);

    return {
      id: opts.id,
      generatedAt: opts.generatedAt,
      period: { from: opts.from, to: opts.to },
      kpi: {
        target: KPI_TARGET_PAID_TICKETS,
        b2cApplications,
        b2bPaidTickets,
        gap,
      },
      channels,
      hypotheses: {
        problems: all.filter((h) => h.kind === 'problem'),
        solutions: all.filter((h) => h.kind === 'solution'),
      },
      decisions,
      b2bSummary,
      funnel: {
        visits: totalVisits,
        b2cApplications,
        b2bPipelineTickets,
        b2bPaidTickets,
      },
      breakdowns: {
        utm: topUtm(utmStats),
        geoDevice: topGeoDevice(geoDeviceStats),
        entryPages: topPages(pageStats),
        exitPages: topPages(exitPageStats),
      },
      goalLabel,
    };
  }
}
