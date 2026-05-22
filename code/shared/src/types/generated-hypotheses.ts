/**
 * Types for AI-generated problem + solution hypotheses (Phase A).
 *
 * Problem formula: «[segment] испытывает [trouble] при [action], потому что [barrier]»
 * Solution formula: «Если [action], то [userBenefit], что приведёт к [businessResult]»
 *
 * These types are transport-only — they are produced by parseHypotheses() and stored
 * in the snapshot. No runtime logic lives here; keep this file pure type declarations.
 */

/** A problem hypothesis grounded in snapshot numbers. */
export interface ProblemHypothesis {
  /** Stable identifier assigned by the AI (e.g. "P01"). */
  readonly id: string;
  /** The user segment that experiences the problem (e.g. «посетитель с мобильного из России»). */
  readonly segment: string;
  /** The concrete difficulty / pain the segment experiences. */
  readonly trouble: string;
  /** The action or goal scenario where the difficulty occurs. */
  readonly action: string;
  /** The specific barrier in the product that causes the trouble. */
  readonly barrier: string;
  /** Reference to the snapshot number that grounds this hypothesis (anti-hallucination). */
  readonly evidence: string;
}

/** Five mandatory risk dimensions for every solution hypothesis. */
export type SolutionRiskKind = 'value' | 'usability' | 'feasibility' | 'business' | 'legal';

/** A single risk assessment for one dimension. */
export interface SolutionRisk {
  readonly kind: SolutionRiskKind;
  /** One-sentence description of how the risk may materialise. */
  readonly note: string;
}

/** Experiment design: what we verify, how, with whom, and what counts as success. */
export interface ValidationPlan {
  readonly whatToVerify: string;
  /** At least two distinct methods (e.g. «интервью», «клик-тест», «Fake-Door»). */
  readonly methods: readonly string[];
  /** Target audience for the experiment. */
  readonly audience: string;
  /** Recruitment / outreach channel. */
  readonly channel: string;
  /** Measurable success criterion (e.g. «≥10% CTR»). */
  readonly successCriteria: string;
}

/**
 * ICE = Impact × Confidence × Ease (product, NOT arithmetic mean — see ADR-005).
 * The `score` field MUST always be computed by `iceScore()`, never trusted from AI output.
 */
export interface IceBreakdown {
  /** 1–10 integer estimated by the AI. */
  readonly impact: number;
  /** 1–10 integer estimated by the AI. */
  readonly confidence: number;
  /** 1–10 integer estimated by the AI. */
  readonly ease: number;
  /** One-line rationale for the impact score. */
  readonly impactRationale: string;
  /** One-line rationale for the confidence score. */
  readonly confidenceRationale: string;
  /** One-line rationale for the ease score. */
  readonly easeRationale: string;
  /** Deterministically computed: impact × confidence × ease. Set by parseHypotheses(). */
  readonly score: number;
}

/** A solution hypothesis referencing a problem and fully prioritised by ICE. */
export interface SolutionHypothesis {
  /** Stable identifier assigned by the AI (e.g. "S01"). */
  readonly id: string;
  /** References a ProblemHypothesis.id. */
  readonly problemId: string;
  /** «Мы сделаем ___» — the concrete action or feature. */
  readonly action: string;
  /** «Пользователи смогут ___» — the user benefit. */
  readonly userBenefit: string;
  /** «Приведёт к ___» — the expected business result (metric-level). */
  readonly businessResult: string;
  /** Measurable success criterion for this solution. */
  readonly successCriteria: string;
  /** All five risk dimensions MUST be present. */
  readonly risks: readonly SolutionRisk[];
  /** Experiment plan for validating this hypothesis. */
  readonly validation: ValidationPlan;
  /** ICE scores with rationales; score is computed deterministically by parseHypotheses(). */
  readonly ice: IceBreakdown;
}

/** Root output type returned by generateHypotheses() and stored in the snapshot. */
export interface GeneratedHypotheses {
  readonly problems: readonly ProblemHypothesis[];
  readonly solutions: readonly SolutionHypothesis[];
}
