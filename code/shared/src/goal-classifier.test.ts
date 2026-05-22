import { describe, it, expect } from 'vitest';
import type { Goal } from './index';
import { classifyGoal, selectPrimaryGoal } from './index';

const goal = (over: Partial<Goal>): Goal => ({
  id: 1,
  name: 'Цель',
  type: 'action',
  isB2b: false,
  isArchived: false,
  syncedAt: '2025-01-01T00:00:00.000Z',
  ...over,
});

describe('classifyGoal', () => {
  it('marks payment/purchase goals as purchase (RU + EN)', () => {
    expect(classifyGoal(goal({ name: 'Оплата билета' }))).toBe('purchase');
    expect(classifyGoal(goal({ name: 'Ecommerce: покупка' }))).toBe('purchase');
    expect(classifyGoal(goal({ name: 'Checkout completed' }))).toBe('purchase');
    expect(classifyGoal(goal({ name: 'Заказ оформлен' }))).toBe('purchase');
  });

  it('marks lead/application goals as application', () => {
    expect(classifyGoal(goal({ name: 'Заявка на билет' }))).toBe('application');
    expect(classifyGoal(goal({ name: 'Lead form submitted' }))).toBe('application');
    expect(classifyGoal(goal({ name: 'Регистрация' }))).toBe('application');
  });

  it('prefers purchase when a name mentions both', () => {
    expect(classifyGoal(goal({ name: 'Оплата заявки' }))).toBe('purchase');
  });

  it('falls back to other for unrelated goals', () => {
    expect(classifyGoal(goal({ name: 'Просмотр видео' }))).toBe('other');
  });
});

describe('selectPrimaryGoal', () => {
  it('picks the purchase goal over application and other goals', () => {
    const goals = [
      goal({ id: 10, name: 'Заявка на билет' }),
      goal({ id: 20, name: 'Ecommerce: покупка' }),
      goal({ id: 30, name: 'Просмотр программы' }),
    ];
    expect(selectPrimaryGoal(goals)?.id).toBe(20);
  });

  it('falls back to an application goal when there is no purchase goal', () => {
    const goals = [goal({ id: 5, name: 'Просмотр' }), goal({ id: 7, name: 'Заявка' })];
    expect(selectPrimaryGoal(goals)?.id).toBe(7);
  });

  it('ignores archived goals', () => {
    const goals = [
      goal({ id: 1, name: 'Оплата', isArchived: true }),
      goal({ id: 2, name: 'Покупка', isArchived: false }),
    ];
    expect(selectPrimaryGoal(goals)?.id).toBe(2);
  });

  it('tie-breaks by lowest id among same-category goals', () => {
    const goals = [goal({ id: 9, name: 'Оплата картой' }), goal({ id: 4, name: 'Оплата СБП' })];
    expect(selectPrimaryGoal(goals)?.id).toBe(4);
  });

  it('returns undefined when no active goal looks like a KPI', () => {
    expect(selectPrimaryGoal([goal({ name: 'Просмотр видео' })])).toBeUndefined();
    expect(selectPrimaryGoal([goal({ name: 'Оплата', isArchived: true })])).toBeUndefined();
    expect(selectPrimaryGoal([])).toBeUndefined();
  });
});
