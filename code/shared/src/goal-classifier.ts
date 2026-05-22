/**
 * Deterministic primary-KPI-goal detection. Metrika counters carry dozens of goals; the dashboard
 * needs to know which one is the «оплата/покупка» KPI without the user hand-picking a GOAL_ID.
 *
 * This is a pure, keyword-based classifier — no LLM, no clock — so the choice is reproducible and
 * stays out of the report render path (anti-hallucination: every number still traces to raw_responses;
 * this only decides which goal's reaches get synced). The picked goal is always a real goal from the
 * provided list.
 */
import type { Goal } from './types/metrics';

export type GoalCategory = 'purchase' | 'application' | 'other';

/** Name fragments (lowercased, substring match) that mark a payment/purchase goal — the KPI. */
const PURCHASE_KEYWORDS = [
  'оплат', // оплата / оплаты / оплачен
  'оплач',
  'покупк', // покупка
  'куплен',
  'продаж', // продажа / продажи
  'заказ', // заказ оформлен
  'payment',
  'purchase',
  'ecommerce',
  'checkout',
  'paid',
  'sale',
];

/** Name fragments that mark an «заявка»/lead goal — counted, but not the payment KPI. */
const APPLICATION_KEYWORDS = [
  'заявк', // заявка / заявки
  'лид',
  'lead',
  'форм', // форма / форму
  'form',
  'регистрац',
  'registration',
  'signup',
  'sign-up',
  'application',
  'request',
];

function matches(name: string, keywords: readonly string[]): boolean {
  const n = name.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

/**
 * Coarse KPI category for a goal, by its name. Purchase is checked first so a name that mentions
 * both (e.g. «Оплата заявки») classifies as the stronger signal — purchase.
 */
export function classifyGoal(goal: Goal): GoalCategory {
  if (matches(goal.name, PURCHASE_KEYWORDS)) return 'purchase';
  if (matches(goal.name, APPLICATION_KEYWORDS)) return 'application';
  return 'other';
}

/**
 * Pick the primary KPI goal: the payment/purchase goal if any, else the best application goal.
 * Archived goals are ignored; ties break by lowest id (deterministic). Returns undefined when no
 * active goal looks like a KPI — the caller then keeps its explicit/no-goal behaviour.
 */
export function selectPrimaryGoal(goals: readonly Goal[]): Goal | undefined {
  const active = goals.filter((g) => !g.isArchived);
  const firstOf = (category: GoalCategory): Goal | undefined =>
    active.filter((g) => classifyGoal(g) === category).sort((a, b) => a.id - b.id)[0];
  return firstOf('purchase') ?? firstOf('application');
}
