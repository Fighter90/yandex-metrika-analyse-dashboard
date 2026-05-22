import { describe, it, expect } from 'vitest';
import { config, hasMetrikaToken } from '../src/config';

describe('hasMetrikaToken', () => {
  it('is false for an empty token', () => {
    expect(hasMetrikaToken('')).toBe(false);
  });

  it('is false for the placeholder value', () => {
    expect(hasMetrikaToken('YOUR_OAUTH_TOKEN_HERE')).toBe(false);
  });

  it('is true for a real-looking token', () => {
    expect(hasMetrikaToken('y0_AgAAAAByExample')).toBe(true);
  });

  it('falls back to the configured token when no argument is given', () => {
    const expected =
      config.YANDEX_OAUTH_TOKEN.length > 0 && config.YANDEX_OAUTH_TOKEN !== 'YOUR_OAUTH_TOKEN_HERE';
    expect(hasMetrikaToken()).toBe(expected);
  });
});

describe('config', () => {
  it('coerces COUNTER_ID to a positive number', () => {
    expect(typeof config.COUNTER_ID).toBe('number');
    expect(config.COUNTER_ID).toBeGreaterThan(0);
  });

  it('provides sane runtime defaults', () => {
    expect(config.TIMEZONE).toBeTruthy();
    expect(config.API_PORT).toBeGreaterThan(0);
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.ARCHIVED_GOAL_ID_THRESHOLD).toBeGreaterThanOrEqual(0);
    expect(config.LOW_UTM_COVERAGE_RATIO).toBeGreaterThan(0);
  });
});
