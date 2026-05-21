import { describe, it, expect, vi, afterEach } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MetrikaClient,
  MetrikaHttpError,
  MetrikaSchemaError,
  type FetchLike,
} from '../../src/metrika/client';
import { StatDataResponseSchema, GoalsResponseSchema } from '../../src/metrika/schemas';
import { ENDPOINTS } from '../../src/metrika/endpoints';
import type { RateLimiter } from '../../src/utils/rate-limiter';

const noLimiter = { take: () => 0 } as unknown as RateLimiter;

function res(
  body: unknown,
  init: { ok?: boolean; status?: number; text?: string } = {},
): ReturnType<FetchLike> extends Promise<infer R> ? R : never {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
    text: async () => init.text ?? '',
  };
}

const sample = { data: [{ dimensions: [{ name: 'podcast' }], metrics: [100, 5] }], total_rows: 1 };

function client(fetchFn: FetchLike, over: Record<string, unknown> = {}): MetrikaClient {
  return new MetrikaClient({
    token: 'secret',
    baseUrl: 'https://api.example',
    fetchFn,
    limiter: noLimiter,
    sleep: vi.fn().mockResolvedValue(undefined),
    jitter: () => 0,
    retries: 3,
    errorDumpDir: join(tmpdir(), 'pca-dump-default'),
    now: () => 1,
    ...over,
  });
}

afterEach(() => vi.clearAllMocks());

describe('MetrikaHttpError', () => {
  it('marks 429 and 5xx retryable, 4xx not', () => {
    expect(new MetrikaHttpError(429, 'x').retryable).toBe(true);
    expect(new MetrikaHttpError(503, 'x').retryable).toBe(true);
    expect(new MetrikaHttpError(404, 'x').retryable).toBe(false);
  });
});

describe('MetrikaClient construction', () => {
  it('constructs with only a token (all defaults)', () => {
    expect(new MetrikaClient({ token: 't' })).toBeInstanceOf(MetrikaClient);
  });
});

describe('MetrikaClient.get', () => {
  it('returns validated data and sends the OAuth header, skipping undefined params', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(sample)) as unknown as FetchLike;
    const c = client(fetchFn);
    const out = await c.get(ENDPOINTS.statData, { ids: 1, foo: undefined }, StatDataResponseSchema);
    expect(out.data[0]?.metrics).toEqual([100, 5]);

    const call = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] ?? [];
    const url = call[0] as string;
    expect(url).toContain('ids=1');
    expect(url).not.toContain('foo');
    expect(call[1]).toEqual({ headers: { Authorization: 'OAuth secret' } });
  });

  it('throws MetrikaHttpError without retrying on a 4xx', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res({}, { ok: false, status: 400, text: 'bad' }));
    const c = client(fetchFn as unknown as FetchLike);
    await expect(c.get(ENDPOINTS.statData, {}, StatDataResponseSchema)).rejects.toBeInstanceOf(
      MetrikaHttpError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries a 5xx then succeeds', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(res({}, { ok: false, status: 500, text: 'err' }))
      .mockResolvedValueOnce(res(sample));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const c = client(fetchFn as unknown as FetchLike, { sleep });
    const out = await c.get(ENDPOINTS.statData, {}, StatDataResponseSchema);
    expect(out.total_rows).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('waits when the rate limiter requires it', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(sample));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const waitLimiter = { take: () => 7 } as unknown as RateLimiter;
    const c = client(fetchFn as unknown as FetchLike, { sleep, limiter: waitLimiter });
    await c.get(ENDPOINTS.statData, {}, StatDataResponseSchema);
    expect(sleep).toHaveBeenCalledWith(7);
  });

  it('dumps the body and throws MetrikaSchemaError on a schema mismatch', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pca-dump-'));
    const fetchFn = vi.fn().mockResolvedValue(res({ unexpected: true }));
    const c = client(fetchFn as unknown as FetchLike, { errorDumpDir: dir, now: () => 42 });
    try {
      await c.get(ENDPOINTS.statData, {}, StatDataResponseSchema);
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(MetrikaSchemaError);
      const err = e as MetrikaSchemaError;
      expect(err.dumpPath).toContain('42');
      expect(existsSync(err.dumpPath)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('schemas + endpoints', () => {
  it('validates a goals response and builds the goals endpoint', () => {
    const parsed = GoalsResponseSchema.parse({ goals: [{ id: 80, name: 'pay', type: 'action' }] });
    expect(parsed.goals[0]?.id).toBe(80);
    expect(ENDPOINTS.goals(54280963)).toBe('/management/v1/counter/54280963/goals');
  });
});
