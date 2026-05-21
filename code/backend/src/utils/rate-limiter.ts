/**
 * Token-bucket rate limiter. Metrika allows ~1000 req/hour.
 * `take()` consumes one token and returns the ms a caller should wait before
 * proceeding (0 if a token was immediately available). The clock is injectable
 * for deterministic tests.
 */
export class RateLimiter {
  private tokens: number;
  private last: number;

  constructor(
    private readonly capacity: number,
    private readonly msPerToken: number,
    private readonly clock: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.last = clock();
  }

  private refill(): void {
    const now = this.clock();
    const gained = (now - this.last) / this.msPerToken;
    if (gained > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + gained);
      this.last = now;
    }
  }

  take(): number {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return 0;
    }
    const wait = Math.ceil((1 - this.tokens) * this.msPerToken);
    this.tokens -= 1;
    this.last += wait;
    return wait;
  }
}

/** Build the production limiter: 1000 tokens/hour. */
export function defaultRateLimiter(): RateLimiter {
  return new RateLimiter(1000, 3_600_000 / 1000);
}
