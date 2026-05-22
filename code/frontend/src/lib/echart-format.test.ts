import { describe, it, expect } from 'vitest';
import { intTooltip, intBarLabel } from './echart-format';
import { formatInt } from './format';

describe('intTooltip', () => {
  it('formats tooltip values with thousands grouping', () => {
    expect(intTooltip.valueFormatter(1290)).toBe(formatInt(1290));
    expect(intTooltip.valueFormatter(1290)).toMatch(/1.290/); // thin space between 1 and 290
  });
});

describe('intBarLabel', () => {
  it('builds a visible label at the given position with a thousands-grouped formatter', () => {
    const label = intBarLabel('right') as {
      show: boolean;
      position: string;
      formatter: (p: { value: number }) => string;
    };
    expect(label.show).toBe(true);
    expect(label.position).toBe('right');
    expect(label.formatter({ value: 1290 })).toBe(formatInt(1290));
  });
});
