import { describe, it, expect, vi } from 'vitest';
import { withRetry, realSleep, type RetryOptions } from '../../src/utils/retry';

function opts(over: Partial<RetryOptions> = {}): RetryOptions {
  return {
    retries: 3,
    baseMs: 10,
    maxMs: 100,
    jitter: () => 0,
    sleep: vi.fn().mockResolvedValue(undefined),
    isRetryable: () => true,
    ...over,
  };
}

describe('withRetry', () => {
  it('returns immediately on success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await withRetry(fn, opts())).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on a retryable error and then succeeds', async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue('ok');
    const o = opts();
    expect(await withRetry(fn, o)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(o.sleep).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(withRetry(fn, opts({ retries: 2 }))).rejects.toThrow('boom');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('nope'));
    await expect(withRetry(fn, opts({ isRetryable: () => false }))).rejects.toThrow('nope');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('realSleep resolves after the delay', async () => {
    await expect(realSleep(1)).resolves.toBeUndefined();
  });
});
