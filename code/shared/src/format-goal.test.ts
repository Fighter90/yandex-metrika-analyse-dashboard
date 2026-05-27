import { describe, it, expect } from 'vitest';
import type { Goal } from './index';
import { formatGoalLabel } from './index';

const goal = (over: Partial<Goal>): Goal => ({
  id: 1,
  name: 'Цель',
  type: 'action',
  isB2b: false,
  isArchived: false,
  syncedAt: '2025-01-01T00:00:00.000Z',
  ...over,
});

describe('formatGoalLabel', () => {
  it('labels a purchase goal as paid (no application caveat/estimate)', () => {
    const label = formatGoalLabel(goal({ name: 'Ecommerce: покупка' }));
    expect(label).toEqual({
      title: 'Оплат',
      isPaid: true,
      showApplicationsCaveat: false,
      showEstimate: false,
    });
  });

  it('labels a non-purchase goal as B2C applications with caveat + estimate', () => {
    const label = formatGoalLabel(goal({ name: 'Отправка формы' }));
    expect(label).toEqual({
      title: 'Заявок B2C',
      isPaid: false,
      showApplicationsCaveat: true,
      showEstimate: true,
    });
  });

  it('treats an undefined goal as applications (safe default)', () => {
    expect(formatGoalLabel(undefined).isPaid).toBe(false);
  });
});
