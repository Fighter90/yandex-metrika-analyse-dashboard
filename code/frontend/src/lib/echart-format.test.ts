import { describe, it, expect } from 'vitest';
import { intTooltip } from './echart-format';
import { formatInt } from './format';

describe('intTooltip', () => {
  it('formats tooltip values with thousands grouping', () => {
    expect(intTooltip.valueFormatter(1290)).toBe(formatInt(1290));
    expect(intTooltip.valueFormatter(1290)).toMatch(/1.290/); // thin space between 1 and 290
  });
});
