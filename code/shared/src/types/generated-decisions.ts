/**
 * Types for AI-generated proposed decisions (v2.7.0). The methodology Decision Log is no longer
 * a hand-edited UI page — instead the AI proposes ≥3 decisions from the snapshot + generated
 * hypotheses, stored in the snapshot and rendered in the report. Transport-only types; no logic.
 */

/** Confidence in a proposed decision's outcome. */
export type GeneratedDecisionConfidence = 'low' | 'medium' | 'high';

/** Traffic-light outcome of a proposed decision. */
export type GeneratedDecisionOutcome = 'green' | 'yellow' | 'red';

/** One AI-proposed Decision Log entry, grounded in snapshot data + a hypothesis. */
export interface GeneratedDecision {
  /** Stable identifier assigned by the AI (e.g. "DL01"). */
  readonly id: string;
  /** References a generated hypothesis id (problem "P.." or solution "S.."). */
  readonly hypothesisId: string;
  /** Verification method (e.g. «количественный анализ», «A/B-тест»). */
  readonly method: string;
  /** Observation window in days. */
  readonly periodDays: number;
  /** Scope of the check (segment / page / channel). */
  readonly scope: string;
  /** The finding / conclusion drawn from the data. */
  readonly findings: string;
  /** Confidence in the finding. */
  readonly confidence: GeneratedDecisionConfidence;
  /** Optional supporting quote/number from the snapshot (anti-hallucination). */
  readonly evidence: string;
  /** Source reference (snapshotId / raw_response). */
  readonly source: string;
  /** Traffic-light outcome. */
  readonly outcome: GeneratedDecisionOutcome;
  /** One-line rationale for the outcome. */
  readonly outcomeRationale: string;
}

/** Root output returned by generateDecisions() and stored in the snapshot. */
export interface GeneratedDecisions {
  readonly decisions: readonly GeneratedDecision[];
}
