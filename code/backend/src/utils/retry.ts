export interface RetryOptions {
  /** Max retries after the first attempt. */
  readonly retries: number;
  readonly baseMs: number;
  readonly maxMs: number;
  /** Returns a multiplier in [0, 1) added as jitter. Injectable for tests. */
  readonly jitter: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly isRetryable: (err: unknown) => boolean;
}

/** Real timer-based sleep (not used in tests, which inject their own). */
export const realSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn` with exponential backoff + jitter. Retries only when `isRetryable`
 * returns true and attempts remain; otherwise rethrows.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= opts.retries || !opts.isRetryable(err)) throw err;
      const backoff = Math.min(opts.maxMs, opts.baseMs * 2 ** attempt) * (1 + opts.jitter());
      await opts.sleep(backoff);
      attempt += 1;
    }
  }
}
