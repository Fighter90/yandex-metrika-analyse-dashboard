import { ASSUMPTION_CATEGORIES, ICE_CONFIG } from './constants';
import type { NewHypothesis } from './types/hypotheses';

export interface ValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
}

const MIN_ASSUMPTIONS = 3;
const MIN_METHODS = 2;

function isBlank(s: string | undefined): boolean {
  return s === undefined || s.trim().length === 0;
}

function inIceRange(n: number): boolean {
  return Number.isInteger(n) && n >= ICE_CONFIG.scale.min && n <= ICE_CONFIG.scale.max;
}

/**
 * Hypothesis completeness check. A hypothesis is invalid (and must not be persisted)
 * unless: all format fields + rationales present, >=3 hidden assumptions spanning all
 * categories, >=2 distinct validation methods, ICE factors in range, positive deadline.
 */
export function validateHypothesis(h: NewHypothesis): ValidationResult {
  const errors: string[] = [];

  const requiredText: ReadonlyArray<readonly [string, string]> = [
    ['subject', h.subject],
    ['action', h.action],
    ['solution', h.solution],
    ['condition', h.condition],
    ['title', h.title],
    ['greenCriteria', h.greenCriteria],
    ['yellowCriteria', h.yellowCriteria],
    ['redCriteria', h.redCriteria],
    ['impactRationale', h.impactRationale],
    ['confidenceRationale', h.confidenceRationale],
    ['easeRationale', h.easeRationale],
  ];
  for (const [field, value] of requiredText) {
    if (isBlank(value)) errors.push(`${field} is required`);
  }

  if (h.hiddenAssumptions.length < MIN_ASSUMPTIONS) {
    errors.push(`need >=${MIN_ASSUMPTIONS} hidden assumptions`);
  }
  const categories = new Set(h.hiddenAssumptions.map((a) => a.category));
  if (categories.size < ASSUMPTION_CATEGORIES.length) {
    errors.push(`hidden assumptions must cover categories: ${ASSUMPTION_CATEGORIES.join('/')}`);
  }

  if (h.validationMethods.length < MIN_METHODS) {
    errors.push(`need >=${MIN_METHODS} validation methods`);
  }
  const methodTypes = new Set(h.validationMethods.map((m) => m.type));
  if (methodTypes.size < MIN_METHODS) {
    errors.push(`need >=${MIN_METHODS} distinct validation method types`);
  }

  const iceFactors: ReadonlyArray<readonly [string, number]> = [
    ['impact', h.impact],
    ['confidence', h.confidence],
    ['ease', h.ease],
  ];
  for (const [field, value] of iceFactors) {
    if (!inIceRange(value)) {
      errors.push(
        `${field} must be an integer in ${ICE_CONFIG.scale.min}..${ICE_CONFIG.scale.max}`,
      );
    }
  }

  if (!Number.isInteger(h.deadlineDays) || h.deadlineDays < 1) {
    errors.push('deadlineDays must be a positive integer');
  }

  return { ok: errors.length === 0, errors };
}

/** ICE = Impact × Confidence × Ease (product). */
export function iceScore(impact: number, confidence: number, ease: number): number {
  return impact * confidence * ease;
}

export type IceBucket = 'low' | 'medium' | 'high' | 'top';

/** Map an ICE score to its priority bucket using the configured thresholds. */
export function iceBucket(score: number): IceBucket {
  const { low, medium, high } = ICE_CONFIG.thresholds;
  if (score <= low) return 'low';
  if (score <= medium) return 'medium';
  if (score <= high) return 'high';
  return 'top';
}
