import { describe, it, expect } from 'vitest';
import { PCA_THEME } from './echarts-theme';

describe('PCA_THEME', () => {
  it('defines a colour palette and transparent background', () => {
    expect(Array.isArray(PCA_THEME.color)).toBe(true);
    expect(PCA_THEME.color.length).toBeGreaterThanOrEqual(3);
    expect(PCA_THEME.color.every((c) => /^#[0-9A-F]{6}$/i.test(c))).toBe(true);
    expect(PCA_THEME.backgroundColor).toBe('transparent');
  });
});
