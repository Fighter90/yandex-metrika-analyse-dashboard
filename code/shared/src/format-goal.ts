import type { Goal } from './types/metrics';
import { classifyGoal } from './goal-classifier';

/**
 * How a goal's reaches should be labelled across the UI and report. When the primary goal is a
 * purchase/payment goal, its `goalReaches` ARE payments, so we say «Оплат» and drop the
 * «заявка ≠ оплата» caveat and the conversion estimate. For any other goal, reaches are
 * applications (заявки), which are an upper bound on payments — keep the caveat and estimate.
 */
export interface GoalLabel {
  readonly title: string;
  readonly isPaid: boolean;
  readonly showApplicationsCaveat: boolean;
  readonly showEstimate: boolean;
}

export function formatGoalLabel(goal: Goal | undefined): GoalLabel {
  if (goal && classifyGoal(goal) === 'purchase') {
    return { title: 'Оплат', isPaid: true, showApplicationsCaveat: false, showEstimate: false };
  }
  return {
    title: 'Заявок B2C',
    isPaid: false,
    showApplicationsCaveat: true,
    showEstimate: true,
  };
}
