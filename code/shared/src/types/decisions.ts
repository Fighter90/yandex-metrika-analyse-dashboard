/** Decision Log types (skill-decision-log.md), shared across backend and frontend. */

export type DecisionMethod = 'synthetic' | 'live' | 'quantitative' | 'market' | 'mixed';
export type DecisionOutcome = 'green' | 'yellow' | 'red';
export type FindingConfidence = 'high' | 'medium' | 'low';

export interface DecisionFinding {
  readonly text: string;
  readonly confidence: FindingConfidence;
}

export interface DecisionEvidence {
  readonly quote: string;
  readonly source: string;
  readonly rawResponseId?: number;
}

export interface NewDecision {
  readonly hypothesisId: number;
  readonly date: string;
  readonly method: DecisionMethod;
  readonly scope: string;
  readonly periodDays: number;
  readonly findings: readonly DecisionFinding[];
  readonly evidence: readonly DecisionEvidence[];
  readonly outcome: DecisionOutcome;
  readonly outcomeRationale: string;
  readonly nextStep: string;
  readonly responsible?: string;
  readonly nextDeadline?: string;
  readonly previousDecisionId?: number;
  readonly spawnedHypothesisIds?: readonly number[];
  readonly decidedBy: string;
  readonly participants?: string;
}

export interface Decision extends NewDecision {
  readonly id: number;
  readonly number: string;
  readonly exportedMdPath?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
