import { describe, it, expect } from 'vitest';
import type { PageStat } from '@pca/shared';
import { pageRows, pageBarOption } from './behavior';

const page = (over: Partial<PageStat>): PageStat => ({
  date: '2025-01-01',
  page: '/lp',
  visits: 10,
  users: 9,
  bounceRate: 0.2,
  goalReaches: 1,
  conversionRate: 0.1,
  ...over,
});

describe('pageRows', () => {
  it('aggregates by page, visit-weights bounce rate, sorts by visits desc, guards zero visits', () => {
    const rows = pageRows([
      page({ page: '/lp', visits: 10, goalReaches: 1, bounceRate: 0.5 }),
      page({ page: '/lp', visits: 30, goalReaches: 2, bounceRate: 0.1 }),
      page({ page: '/pricing', visits: 5, goalReaches: 1, bounceRate: 0.4 }),
      page({ page: '/empty', visits: 0, goalReaches: 0, bounceRate: 0 }),
    ]);
    expect(rows[0]?.page).toBe('/lp');
    expect(rows[0]?.visits).toBe(40);
    // visit-weighted bounce: (0.5*10 + 0.1*30) / 40 = 0.2
    expect(rows[0]?.bounceRate).toBeCloseTo(0.2);
    expect(rows[0]?.conversionRate).toBeCloseTo(3 / 40);
    const empty = rows.find((r) => r.page === '/empty');
    expect(empty?.bounceRate).toBe(0);
    expect(empty?.conversionRate).toBe(0);
  });
});

describe('pageBarOption', () => {
  it('shortens full URLs to their path, maps host-only URLs to "/", builds visits + reaches bars', () => {
    const rows = pageRows([
      page({ page: 'https://productcamp.ru/reg-new', visits: 70, goalReaches: 30 }),
      page({ page: 'https://productcamp.ru', visits: 40, goalReaches: 2 }), // host only → '/'
      page({ page: '/program', visits: 10, goalReaches: 1 }), // already a path
    ]);
    const o = pageBarOption(rows, 'Входы') as {
      title: { text: string };
      yAxis: { data: string[] };
      series: { name: string; data: number[] }[];
    };
    expect(o.title.text).toBe('Входы');
    // reversed (largest at top): /program(10), '/'(40), /reg-new(70)
    expect(o.yAxis.data).toEqual(['/program', '/', '/reg-new']);
    expect(o.series[0]?.name).toBe('Визиты');
    expect(o.series[1]?.data).toEqual([1, 2, 30]);
  });
});
