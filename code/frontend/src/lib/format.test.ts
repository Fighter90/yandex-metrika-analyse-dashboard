import { describe, it, expect } from 'vitest';
import { formatInt, formatPercent, formatDate } from './format';

describe('format', () => {
  it('formatInt rounds and groups', () => {
    expect(formatInt(1234.6)).toMatch(/1.235/);
  });

  it('formatPercent uses default and custom digits', () => {
    expect(formatPercent(0.05)).toBe('5.0%');
    expect(formatPercent(0.0523, 2)).toBe('5.23%');
  });

  it('formatDate trims to YYYY-MM-DD', () => {
    expect(formatDate('2025-01-02T10:00:00.000Z')).toBe('2025-01-02');
  });
});
