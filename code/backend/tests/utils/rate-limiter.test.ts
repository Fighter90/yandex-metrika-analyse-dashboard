import { describe, it, expect } from 'vitest';
import { RateLimiter, defaultRateLimiter } from '../../src/utils/rate-limiter';

describe('RateLimiter', () => {
  it('returns 0 while tokens remain (no time elapsed)', () => {
    const t = 1000;
    const rl = new RateLimiter(2, 1000, () => t);
    expect(rl.take()).toBe(0);
    expect(rl.take()).toBe(0);
  });

  it('returns a positive wait once exhausted', () => {
    const rl = new RateLimiter(1, 1000, () => 0);
    expect(rl.take()).toBe(0);
    expect(rl.take()).toBeGreaterThan(0);
  });

  it('refills tokens as time passes', () => {
    let t = 0;
    const rl = new RateLimiter(1, 1000, () => t);
    expect(rl.take()).toBe(0);
    expect(rl.take()).toBeGreaterThan(0);
    t = 5000;
    expect(rl.take()).toBe(0);
  });

  it('defaultRateLimiter issues an immediate token', () => {
    expect(defaultRateLimiter().take()).toBe(0);
  });
});
