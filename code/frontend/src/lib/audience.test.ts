import { describe, it, expect } from 'vitest';
import type { GeoDeviceStat } from '@pca/shared';
import { byCountry, byDevice, audienceBarOption, deviceShareOption } from './audience';

const geo = (over: Partial<GeoDeviceStat>): GeoDeviceStat => ({
  date: '2025-01-01',
  country: 'Россия',
  device: 'mobile',
  visits: 10,
  users: 9,
  goalReaches: 1,
  conversionRate: 0.1,
  ...over,
});

describe('byCountry', () => {
  it('aggregates by country, sorts by visits desc, guards zero visits', () => {
    const rows = byCountry([
      geo({ country: 'Россия', visits: 10, goalReaches: 1 }),
      geo({ country: 'Россия', visits: 30, goalReaches: 2 }),
      geo({ country: 'Казахстан', visits: 5, goalReaches: 1 }),
      geo({ country: 'Пусто', visits: 0, goalReaches: 0 }),
    ]);
    expect(rows[0]?.label).toBe('Россия');
    expect(rows[0]?.visits).toBe(40);
    expect(rows[0]?.conversionRate).toBeCloseTo(3 / 40);
    expect(rows.find((r) => r.label === 'Пусто')?.conversionRate).toBe(0);
  });
});

describe('byDevice', () => {
  it('aggregates by device category', () => {
    const rows = byDevice([
      geo({ device: 'mobile', visits: 10, users: 8 }),
      geo({ device: 'desktop', visits: 4, users: 4 }),
      geo({ device: 'mobile', visits: 6, users: 5 }),
    ]);
    expect(rows[0]?.label).toBe('mobile');
    expect(rows[0]?.visits).toBe(16);
    expect(rows[0]?.users).toBe(13);
  });
});

describe('audienceBarOption', () => {
  it('builds a horizontal bar of visits (top rows, largest at top) with a title', () => {
    const rows = byCountry([
      geo({ country: 'Россия', visits: 100 }),
      geo({ country: 'Казахстан', visits: 40 }),
    ]);
    const o = audienceBarOption(rows, 'Страны') as {
      title: { text: string };
      yAxis: { data: string[] };
      series: { data: number[] }[];
    };
    expect(o.title.text).toBe('Страны');
    // reversed → largest (Россия) at the end for a top-anchored horizontal bar
    expect(o.yAxis.data).toEqual(['Казахстан', 'Россия']);
    expect(o.series[0]?.data).toEqual([40, 100]);
  });
});

describe('deviceShareOption', () => {
  it('builds a donut of visit share by device', () => {
    const o = deviceShareOption(byDevice([geo({ device: 'mobile', visits: 10 })])) as {
      series: { type: string; data: { name: string; value: number }[] }[];
    };
    expect(o.series[0]?.type).toBe('pie');
    expect(o.series[0]?.data[0]).toEqual({ name: 'mobile', value: 10 });
  });

  it('includes a legend with device names', () => {
    const o = deviceShareOption(
      byDevice([geo({ device: 'mobile', visits: 10 }), geo({ device: 'desktop', visits: 5 })]),
    ) as { legend: { data: string[] } };
    expect(o.legend.data).toContain('mobile');
    expect(o.legend.data).toContain('desktop');
  });
});
