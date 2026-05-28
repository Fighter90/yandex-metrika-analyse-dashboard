import { describe, it, expect } from 'vitest';
import type { PageStat } from '@pca/shared';
import { normalizePageUrl, aggregatePages } from '../../src/metrika/queries/normalize-page';

const page = (over: Partial<PageStat>): PageStat => ({
  date: '2026-05-13',
  page: 'https://productcamp.ru/',
  visits: 100,
  users: 90,
  bounceRate: 0.2,
  goalReaches: 5,
  conversionRate: 0.05,
  ...over,
});

describe('normalizePageUrl', () => {
  it('strips a trailing slash and lowercases the host', () => {
    expect(normalizePageUrl('https://ProductCamp.RU/')).toBe('https://productcamp.ru/');
    expect(normalizePageUrl('https://productcamp.ru/lp/')).toBe('https://productcamp.ru/lp');
  });

  it('drops query string and fragment', () => {
    expect(normalizePageUrl('https://productcamp.ru/lp?utm=x#top')).toBe(
      'https://productcamp.ru/lp',
    );
  });

  it('returns non-URL values trimmed (e.g. the «(none)» bucket)', () => {
    expect(normalizePageUrl('  (none)  ')).toBe('(none)');
  });
});

describe('aggregatePages', () => {
  it('merges trailing-slash variants: sums visits, visit-weights bounce/CR (C-005)', () => {
    const out = aggregatePages([
      page({
        page: 'https://productcamp.ru/',
        visits: 300,
        bounceRate: 0.2,
        conversionRate: 0.06,
        goalReaches: 18,
      }),
      page({
        page: 'https://productcamp.ru',
        visits: 100,
        bounceRate: 0.6,
        conversionRate: 0.02,
        goalReaches: 2,
      }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.page).toBe('https://productcamp.ru/');
    expect(out[0]!.visits).toBe(400);
    expect(out[0]!.goalReaches).toBe(20);
    // visit-weighted bounce: (0.2*300 + 0.6*100) / 400 = 0.3
    expect(out[0]!.bounceRate).toBeCloseTo(0.3, 5);
  });

  it('keeps distinct pages separate', () => {
    const out = aggregatePages([
      page({ page: 'https://productcamp.ru/a' }),
      page({ page: 'https://productcamp.ru/b' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('guards division by zero for a zero-visit page', () => {
    const out = aggregatePages([
      page({ page: '(none)', visits: 0, bounceRate: 0, conversionRate: 0 }),
    ]);
    expect(out[0]!.bounceRate).toBe(0);
    expect(out[0]!.conversionRate).toBe(0);
  });
});
