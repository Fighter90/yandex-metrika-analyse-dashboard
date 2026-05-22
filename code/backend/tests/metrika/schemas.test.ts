import { describe, it, expect } from 'vitest';
import { StatDataResponseSchema } from '../../src/metrika/schemas';

describe('StatDataResponseSchema (real Metrika shapes)', () => {
  it('accepts flat per-metric totals (number[]) as /stat/v1/data returns', () => {
    const res = StatDataResponseSchema.safeParse({
      data: [{ dimensions: [{ name: 'direct' }], metrics: [73, 66, 19.1, 150.6] }],
      totals: [106, 92, 18.86, 168.13],
    });
    expect(res.success).toBe(true);
  });

  it('also accepts nested totals (number[][])', () => {
    const res = StatDataResponseSchema.safeParse({
      data: [],
      totals: [
        [1, 2],
        [3, 4],
      ],
    });
    expect(res.success).toBe(true);
  });

  it('passes through extra dimension fields the live API includes (icon_id, url, …)', () => {
    const res = StatDataResponseSchema.safeParse({
      data: [
        {
          dimensions: [{ name: 'Direct traffic', id: 'direct', icon_type: 'traffic-source' }],
          metrics: [73, 66],
        },
      ],
    });
    expect(res.success).toBe(true);
  });
});
