import { describe, it, expect } from 'vitest';
import { ratio } from '../../src/metrika/queries/ratio';

describe('ratio', () => {
  it('converts a Metrika percentage (0–100) to a 0–1 ratio', () => {
    expect(ratio(19.5)).toBeCloseTo(0.195);
    expect(ratio(100)).toBe(1);
    expect(ratio(0)).toBe(0);
  });

  it('treats null/undefined as 0', () => {
    expect(ratio(null)).toBe(0);
    expect(ratio(undefined)).toBe(0);
  });
});
