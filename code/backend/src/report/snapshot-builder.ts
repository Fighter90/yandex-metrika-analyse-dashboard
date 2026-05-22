import { KPI_TARGET_PAID_TICKETS, type ReportSnapshot } from '@pca/shared';
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

/**
 * Assembles an immutable ReportSnapshot purely from the cached DB — no live API calls,
 * no Date.now() (id + generatedAt are inputs), so the same data + inputs yield the same snapshot.
 */
export class SnapshotBuilder {
  constructor(private readonly deps: SnapshotBuilderDeps) {}

  build(opts: BuildOptions): ReportSnapshot {
    const range = { from: opts.from, to: opts.to };
    const channels = this.deps.metrics.listChannelStats(range);
    const all = this.deps.hypotheses.list();
    const decisions = this.deps.decisions.list();
    const b2b = this.deps.b2b.list();

    const b2cApplications = channels.reduce((acc, c) => acc + c.goalReaches, 0);
    const b2bPaidTickets = b2b
      .filter((d) => d.stage === 'paid')
      .reduce((acc, d) => acc + d.tickets, 0);

    return {
      id: opts.id,
      generatedAt: opts.generatedAt,
      period: { from: opts.from, to: opts.to },
      kpi: {
        target: KPI_TARGET_PAID_TICKETS,
        b2cApplications,
        b2bPaidTickets,
        gap: KPI_TARGET_PAID_TICKETS - b2bPaidTickets,
      },
      channels,
      hypotheses: {
        problems: all.filter((h) => h.kind === 'problem'),
        solutions: all.filter((h) => h.kind === 'solution'),
      },
      decisions,
      breakdowns: {
        utm: topUtm(this.deps.metrics.listUtmStats(range)),
        geoDevice: topGeoDevice(this.deps.metrics.listGeoDeviceStats(range)),
        entryPages: topPages(this.deps.metrics.listPageStats(range)),
        exitPages: topPages(this.deps.metrics.listExitPageStats(range)),
      },
    };
  }
}
