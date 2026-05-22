import type { ChannelStat } from './metrics';
import type { Hypothesis } from './hypotheses';
import type { Decision } from './decisions';

/**
 * KPI block. Keeps "заявка ≠ оплата" explicit: b2cApplications are Metrika goal reaches
 * (applications), b2bPaidTickets are actually-paid B2B tickets. gap is against paid only.
 */
export interface ReportKpi {
  readonly target: number;
  readonly b2cApplications: number;
  readonly b2bPaidTickets: number;
  readonly gap: number;
}

/** Immutable report snapshot — DOCX/PDF render from this, never from live data. */
export interface ReportSnapshot {
  readonly id: string;
  readonly generatedAt: string;
  readonly period: { readonly from: string; readonly to: string };
  readonly kpi: ReportKpi;
  readonly channels: ChannelStat[];
  readonly hypotheses: {
    readonly problems: Hypothesis[];
    readonly solutions: Hypothesis[];
  };
  readonly decisions: Decision[];
}
