import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from './api';

function mockFetch(impl: (url: string, init?: RequestInit) => unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => impl(url, init)),
  );
}
function ok(body: unknown, status = 200) {
  return { ok: true, status, json: async () => body, text: async () => '' };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('GETs health, hypotheses, decisions, b2b', async () => {
    mockFetch((url) => {
      if (url.endsWith('/health'))
        return ok({ status: 'ok', counterId: 1, metrikaTokenPresent: false });
      return ok([]);
    });
    expect((await api.health()).status).toBe('ok');
    expect(await api.hypotheses()).toEqual([]);
    expect(await api.decisions()).toEqual([]);
    expect(await api.b2b()).toEqual([]);
  });

  it('builds channel + goals query strings (with and without options)', async () => {
    const calls: string[] = [];
    mockFetch((url) => {
      calls.push(url);
      return ok([]);
    });
    await api.channels();
    await api.channels({ from: '2025-01-01', to: '2025-01-07' });
    await api.goals();
    await api.goals(true);
    expect(calls[0]).toBe('/api/metrics/channels');
    expect(calls[1]).toContain('from=2025-01-01&to=2025-01-07');
    expect(calls[2]).toBe('/api/metrics/goals');
    expect(calls[3]).toContain('archived=true');
  });

  it('POSTs create-hypothesis and sync with JSON bodies', async () => {
    const seen: RequestInit[] = [];
    mockFetch((_url, init) => {
      if (init) seen.push(init);
      return ok({ id: 1 });
    });
    await api.createHypothesis({ title: 'x' } as never);
    await api.sync({ from: 'a', to: 'b', goalId: 80 });
    expect(seen[0]?.method).toBe('POST');
    expect(String(seen[1]?.body)).toContain('goalId');
  });

  it('B2B mutations use the right method, path and body', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    mockFetch((url, init) => {
      calls.push({ url, init });
      return ok({ id: 1 });
    });
    await api.createB2b({ company: 'A', tickets: 5, stage: 'lead', dateAdded: '2025-01-01' });
    await api.updateB2bStage({ id: 7, stage: 'paid', datePaid: '2025-01-05' });
    await api.removeB2b(7);
    expect(calls[0]).toMatchObject({ url: '/api/b2b', init: { method: 'POST' } });
    expect(calls[1]).toMatchObject({ url: '/api/b2b/7', init: { method: 'PATCH' } });
    expect(String(calls[1]?.init?.body)).toContain('paid');
    expect(calls[2]).toMatchObject({ url: '/api/b2b/7', init: { method: 'DELETE' } });
  });

  it('returns undefined for 204 and throws ApiError on non-2xx', async () => {
    mockFetch(() => ({ ok: true, status: 204, json: async () => ({}), text: async () => '' }));
    expect(await api.b2b()).toBeUndefined();

    mockFetch(() => ({ ok: false, status: 422, json: async () => ({}), text: async () => 'bad' }));
    await expect(api.hypotheses()).rejects.toBeInstanceOf(ApiError);
  });
});
