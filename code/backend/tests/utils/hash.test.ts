import { describe, it, expect } from 'vitest';
import { stableHash } from '../../src/utils/hash';

describe('stableHash', () => {
  it('is deterministic for equal input', () => {
    expect(stableHash({ a: 1, b: 2 })).toBe(stableHash({ a: 1, b: 2 }));
  });

  it('differs for different input', () => {
    expect(stableHash({ a: 1 })).not.toBe(stableHash({ a: 2 }));
  });
});
