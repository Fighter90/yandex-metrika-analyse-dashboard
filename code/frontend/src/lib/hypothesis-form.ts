import type {
  AssumptionCategory,
  DiamondPhase,
  HypothesisKind,
  NewHypothesis,
  ValidationMethodType,
} from '@pca/shared';

/** Flat form state for the structured hypothesis editor. */
export interface HypothesisForm {
  diamondPhase: DiamondPhase;
  kind: HypothesisKind;
  subject: string;
  action: string;
  solution: string;
  condition: string;
  title: string;
  behavior: string;
  market: string;
  tech: string;
  method1Type: ValidationMethodType;
  method1Plan: string;
  method2Type: ValidationMethodType;
  method2Plan: string;
  impact: number;
  confidence: number;
  ease: number;
  impactRationale: string;
  confidenceRationale: string;
  easeRationale: string;
  green: string;
  yellow: string;
  red: string;
  deadlineDays: number;
}

export function emptyForm(): HypothesisForm {
  return {
    diamondPhase: 'define',
    kind: 'problem',
    subject: '',
    action: '',
    solution: '',
    condition: '',
    title: '',
    behavior: '',
    market: '',
    tech: '',
    method1Type: 'quantitative',
    method1Plan: '',
    method2Type: 'synthetic',
    method2Plan: '',
    impact: 5,
    confidence: 5,
    ease: 5,
    impactRationale: '',
    confidenceRationale: '',
    easeRationale: '',
    green: '',
    yellow: '',
    red: '',
    deadlineDays: 7,
  };
}

/** Build the API input from form state — only non-empty assumptions/methods are included. */
export function formToInput(f: HypothesisForm): NewHypothesis {
  const assumptions = (
    [
      ['behavior', f.behavior],
      ['market', f.market],
      ['tech', f.tech],
    ] as const
  )
    .filter(([, text]) => text.trim().length > 0)
    .map(([category, text]) => ({ category: category as AssumptionCategory, text }));

  const methods = [
    { type: f.method1Type, plan: f.method1Plan },
    { type: f.method2Type, plan: f.method2Plan },
  ].filter((m) => m.plan.trim().length > 0);

  return {
    diamondPhase: f.diamondPhase,
    kind: f.kind,
    subject: f.subject,
    action: f.action,
    solution: f.solution,
    condition: f.condition,
    title: f.title,
    hiddenAssumptions: assumptions,
    validationMethods: methods,
    impact: f.impact,
    confidence: f.confidence,
    ease: f.ease,
    impactRationale: f.impactRationale,
    confidenceRationale: f.confidenceRationale,
    easeRationale: f.easeRationale,
    greenCriteria: f.green,
    yellowCriteria: f.yellow,
    redCriteria: f.red,
    deadlineDays: f.deadlineDays,
  };
}

/** Whole days remaining until the deadline (negative if past). */
export function daysToDeadline(deadlineAt: string, now = Date.now()): number {
  return Math.ceil((new Date(deadlineAt).getTime() - now) / 86_400_000);
}
