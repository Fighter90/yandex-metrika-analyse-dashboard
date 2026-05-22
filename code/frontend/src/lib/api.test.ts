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

  it('builds channel + UTM + goals query strings (with and without options)', async () => {
    const calls: string[] = [];
    mockFetch((url) => {
      calls.push(url);
      return ok([]);
    });
    await api.channels();
    await api.channels({ from: '2025-01-01', to: '2025-01-07' });
    await api.utm();
    await api.utm({ from: '2025-01-01', to: '2025-01-07' });
    await api.geoDevice();
    await api.geoDevice({ from: '2025-01-01', to: '2025-01-07' });
    await api.pages();
    await api.pages({ from: '2025-01-01', to: '2025-01-07' });
    await api.exitPages();
    await api.exitPages({ from: '2025-01-01', to: '2025-01-07' });
    await api.goals();
    await api.goals(true);
    await api.rawResponse(42);
    expect(calls[0]).toBe('/api/metrics/channels');
    expect(calls[1]).toContain('from=2025-01-01&to=2025-01-07');
    expect(calls[2]).toBe('/api/metrics/utm');
    expect(calls[3]).toContain('/api/metrics/utm?from=2025-01-01&to=2025-01-07');
    expect(calls[4]).toBe('/api/metrics/geo-device');
    expect(calls[5]).toContain('/api/metrics/geo-device?from=2025-01-01&to=2025-01-07');
    expect(calls[6]).toBe('/api/metrics/pages');
    expect(calls[7]).toContain('/api/metrics/pages?from=2025-01-01&to=2025-01-07');
    expect(calls[8]).toBe('/api/metrics/exit-pages');
    expect(calls[9]).toContain('/api/metrics/exit-pages?from=2025-01-01&to=2025-01-07');
    expect(calls[10]).toBe('/api/metrics/goals');
    expect(calls[11]).toContain('archived=true');
    expect(calls[12]).toBe('/api/metrics/raw/42');
  });

  it('POSTs create-hypothesis and sync with JSON bodies', async () => {
    const seen: RequestInit[] = [];
    mockFetch((_url, init) => {
      if (init) seen.push(init);
      return ok({ id: 1 });
    });
    await api.createHypothesis({ title: 'x' } as never);
    await api.createDecision({ scope: 'd' } as never);
    await api.buildSnapshot({ from: 'a', to: 'b' });
    await api.generateReport({ snapshotId: 'x', format: 'docx' });
    await api.sync({ from: 'a', to: 'b', goalId: 80 });
    expect(seen[0]?.method).toBe('POST');
    expect(seen[1]?.method).toBe('POST');
    expect(seen[2]?.method).toBe('POST');
    expect(String(seen[3]?.body)).toContain('docx');
    expect(String(seen[4]?.body)).toContain('goalId');
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
