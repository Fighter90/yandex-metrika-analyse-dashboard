import { describe, it, expect } from 'vitest';
import { config, hasMetrikaToken, hasAnthropicKey, hasCounterId } from '../src/config';

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

describe('hasAnthropicKey', () => {
  it('is false for empty or placeholder, true for a real-looking key', () => {
    expect(hasAnthropicKey('')).toBe(false);
    expect(hasAnthropicKey('YOUR_ANTHROPIC_API_KEY_HERE')).toBe(false);
    expect(hasAnthropicKey('sk-ant-xyz')).toBe(true);
  });

  it('falls back to the configured key when no argument is given', () => {
    const expected =
      config.ANTHROPIC_API_KEY.length > 0 &&
      config.ANTHROPIC_API_KEY !== 'YOUR_ANTHROPIC_API_KEY_HERE';
    expect(hasAnthropicKey()).toBe(expected);
  });
});

describe('hasCounterId', () => {
  it('is false when unset (0) and true for a real counter id', () => {
    expect(hasCounterId(0)).toBe(false);
    expect(hasCounterId(12345678)).toBe(true);
  });

  it('falls back to the configured counter id when no argument is given', () => {
    expect(hasCounterId()).toBe(config.COUNTER_ID > 0);
  });
});

describe('config', () => {
  it('coerces COUNTER_ID to a non-negative number (0 = not configured)', () => {
    expect(typeof config.COUNTER_ID).toBe('number');
    expect(config.COUNTER_ID).toBeGreaterThanOrEqual(0);
  });

  it('provides sane runtime defaults', () => {
    expect(config.TIMEZONE).toBeTruthy();
    expect(config.API_PORT).toBeGreaterThan(0);
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.ARCHIVED_GOAL_ID_THRESHOLD).toBeGreaterThanOrEqual(0);
    expect(config.LOW_UTM_COVERAGE_RATIO).toBeGreaterThan(0);
  });
});
