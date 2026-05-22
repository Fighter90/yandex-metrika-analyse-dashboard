import type { ChannelStat } from './metrics';
import type { Hypothesis } from './hypotheses';
import type { Decision } from './decisions';
import type { GeneratedHypotheses } from './generated-hypotheses';

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
}
