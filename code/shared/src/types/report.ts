import type { ChannelStat } from './metrics';
import type { Hypothesis } from './hypotheses';
import type { Decision } from './decisions';
import type { GeneratedHypotheses } from './generated-hypotheses';
import type { GeneratedDecisions } from './generated-decisions';
import type { GoalLabel } from '../format-goal';

/** Aggregated top-N breakdown rows for the report appendix (summed across the period). */
export interface UtmBreakdownRow {
  readonly source: string;
  readonly medium: string;
  readonly campaign: string;
  readonly visits: number;
  readonly goalReaches: number;
}

export interface GeoDeviceBreakdownRow {
  readonly country: string;
  readonly device: string;
  readonly visits: number;
  readonly goalReaches: number;
}

export interface PageBreakdownRow {
  readonly page: string;
  readonly visits: number;
  readonly bounceRate: number;
  readonly goalReaches: number;
}

/** Top breakdowns the report renders (top 5 each, by visits). */
export interface ReportBreakdowns {
  readonly utm: UtmBreakdownRow[];
  readonly geoDevice: GeoDeviceBreakdownRow[];
  readonly entryPages: PageBreakdownRow[];
  readonly exitPages: PageBreakdownRow[];
}

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

/** B2B pipeline summary for the report. */
export interface B2bSummary {
  readonly totalTickets: number;
  readonly paidTickets: number;
  readonly dealsCount: number;
  readonly deals: Array<{
    readonly company: string;
    readonly tickets: number;
    readonly stage: string;
  }>;
  readonly byStage: Array<{
    readonly stage: string;
    readonly tickets: number;
    readonly deals: number;
  }>;
}

/** Funnel stages for the report. */
export interface ReportFunnel {
  readonly visits: number;
  readonly b2cApplications: number;
  readonly b2bPipelineTickets: number;
  readonly b2bPaidTickets: number;
}

/** Charts the report embeds as PNG images (DOCX ImageRun / PDF <img>). */
export type ReportChartId = 'channelBar' | 'funnel' | 'channelMix';

/** Rendered chart images keyed by id: base64-encoded PNG bytes (without the data: prefix). */
export type ReportCharts = Partial<Record<ReportChartId, string>>;

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
  readonly b2bSummary: B2bSummary;
  readonly funnel: ReportFunnel;
  readonly breakdowns: ReportBreakdowns;
  /**
   * Optional AI-generated narrative analysis (Anthropic), produced from the snapshot's numbers at
   * generation time and stored here. Clearly labelled in the report; the deterministic render path
   * never calls an LLM — it only prints this stored text. Absent until insights are generated.
   */
  readonly aiNarrative?: string;
  /**
   * Optional AI-generated structured hypotheses (Anthropic), produced once from the snapshot's
   * numbers and stored here. The deterministic render path never calls an LLM — it only reads this
   * stored value. Absent until hypotheses are generated via POST /report/hypotheses.
   */
  readonly generatedHypotheses?: GeneratedHypotheses;
  /**
   * Optional AI-proposed Decision Log entries (Anthropic), produced once from the snapshot +
   * generated hypotheses and stored here. Render path never calls an LLM — reads this stored value.
   * Absent until generated via POST /report/hypotheses (which also produces decisions).
   */
  readonly generatedDecisions?: GeneratedDecisions;
  /**
   * Label for the primary goal's reaches (formatGoalLabel): «Оплат» for purchase goals, else
   * «Заявок B2C». Lets the report/DOCX/PDF headline match the dashboard. Absent → treat as applications.
   */
  readonly goalLabel?: GoalLabel;
  /**
   * Optional rendered chart PNGs (base64), produced once from the snapshot numbers via headless
   * ECharts at report-generation time and embedded identically into DOCX and PDF. The render path
   * stays deterministic — it only reads these bytes. Absent → report renders text/tables only.
   */
  readonly charts?: ReportCharts;
}
