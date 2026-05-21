/** Voronkova-format hypothesis types, shared across backend and frontend. */

export type DiamondPhase = 'define' | 'develop';
export type HypothesisKind = 'problem' | 'solution';
export type AssumptionCategory = 'behavior' | 'market' | 'tech';
export type ValidationMethodType = 'synthetic' | 'live' | 'quantitative' | 'market';
export type HypothesisStatus =
  | 'draft'
  | 'in_progress'
  | 'green'
  | 'yellow'
  | 'red'
  | 'expired';

export interface HiddenAssumption {
  readonly category: AssumptionCategory;
  readonly text: string;
}

export interface ValidationMethod {
  readonly type: ValidationMethodType;
  readonly plan: string;
  readonly cost?: string;
}

export interface HypothesisEvidence {
  readonly type: string;
  readonly rawResponseId?: number;
  readonly slice?: string;
  readonly note?: string;
}

/** Input to create a hypothesis (camelCase domain object; repo maps to columns). */
export interface NewHypothesis {
  readonly diamondPhase: DiamondPhase;
  readonly kind: HypothesisKind;
  readonly subject: string;
  readonly action: string;
  readonly solution: string;
  readonly condition: string;
  readonly title: string;
  readonly description?: string;
  readonly parentId?: number;
  readonly hiddenAssumptions: readonly HiddenAssumption[];
  readonly validationMethods: readonly ValidationMethod[];
  readonly impact: number;
  readonly confidence: number;
  readonly ease: number;
  readonly impactRationale: string;
  readonly confidenceRationale: string;
  readonly easeRationale: string;
  readonly greenCriteria: string;
  readonly yellowCriteria: string;
  readonly redCriteria: string;
  readonly deadlineDays: number;
  readonly evidence?: readonly HypothesisEvidence[];
}

/** A persisted hypothesis as returned by the repository. */
export interface Hypothesis extends NewHypothesis {
  readonly id: number;
  readonly iceScore: number;
  readonly status: HypothesisStatus;
  readonly deadlineAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
