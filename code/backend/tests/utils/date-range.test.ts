import { describe, it, expect } from 'vitest';
import { dayChunks } from '../../src/utils/date-range';

describe('dayChunks', () => {
  it('keeps a <=7-day range as a single chunk', () => {
    expect(dayChunks('2025-01-01', '2025-01-07')).toEqual([
      { from: '2025-01-01', to: '2025-01-07' },
    ]);
  });

  it('splits a >7-day range into per-day chunks', () => {
    const chunks = dayChunks('2025-01-01', '2025-01-15');
    expect(chunks).toHaveLength(15);
    expect(chunks[0]).toEqual({ from: '2025-01-01', to: '2025-01-01' });
    expect(chunks[14]).toEqual({ from: '2025-01-15', to: '2025-01-15' });
  });
});
