import { clampRatio } from '@pca/shared';

export interface WhatIfInput {
  /** Current site visits over the selected period. */
  readonly visits: number;
  /** Current B2C applications (goal reaches) over the period. */
  readonly applications: number;
  /** B2B tickets already paid — counts directly toward the goal. */
  readonly b2bPaid: number;
  /** Goal: number of paid tickets to reach. */
  readonly target: number;
  /** Hypothetical extra traffic, in percent (e.g. 20 = +20% visits). */
  readonly extraVisitsPct: number;
  /** Hypothetical conversion-rate uplift, in percent (e.g. 10 = CR×1.1). */
  readonly crUpliftPct: number;
}

export interface WhatIfResult {
  /** Projected B2C applications after applying the levers (rounded). */
  readonly projectedApplications: number;
  /**
   * Projected paid tickets. NOTE: this is an estimate, не факт — we treat each projected B2C
   * application as a potential paid ticket on top of B2B paid, because Метрика does not track
   * the заявка→оплата step. Use it as a directional «что если», not a forecast.
   */
  readonly projectedPayments: number;
  /** Remaining gap to the target after the projection, floored at 0. */
  readonly gapAfter: number;
  /** Change in applications vs the current baseline (can be negative if levers shrink it). */
  readonly addedVsNow: number;
}

/**
 * Pure «что если» simulator for the Goals page. Models how extra traffic and a CR uplift move the
 * projected applications / payments / gap. Deterministic and side-effect free.
 *
 * Model:
 *   baseCR = applications / visits (0 when visits === 0 — guards division by zero).
 *   newVisits = visits × (1 + extraVisitsPct/100).
 *   newCR = clampRatio(baseCR × (1 + crUpliftPct/100)) — capped at 100%.
 *   projectedApplications = round(newVisits × newCR).
 *   projectedPayments = b2bPaid + projectedApplications (см. WhatIfResult.projectedPayments — это
 *     оценка, не факт: Метрика не покрывает шаг заявка→оплата).
 *   gapAfter = max(0, target − projectedPayments).
 *   addedVsNow = projectedApplications − applications.
 */
export function simulatePayments(input: WhatIfInput): WhatIfResult {
  const { visits, applications, b2bPaid, target, extraVisitsPct, crUpliftPct } = input;

  const baseCr = visits === 0 ? 0 : applications / visits;
  const newVisits = visits * (1 + extraVisitsPct / 100);
  const newCr = clampRatio(baseCr * (1 + crUpliftPct / 100));
  const projectedApplications = Math.round(newVisits * newCr);
  const projectedPayments = b2bPaid + projectedApplications;
  const gapAfter = Math.max(0, target - projectedPayments);
  const addedVsNow = projectedApplications - applications;

  return { projectedApplications, projectedPayments, gapAfter, addedVsNow };
}
