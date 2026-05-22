import type { Page, Route } from '@playwright/test';

/**
 * Shared API mocks for the e2e suite. The backend is mocked at the network layer so the suite is
 * deterministic and needs no OAuth token. Mutating resources (b2b, hypotheses, decisions) are
 * stateful in-closure, so create/update/delete flows behave end-to-end (POST → list re-fetch shows
 * the change). Read-only metrics return fixed fixtures. Pass `errors` to force 500s for a given
 * endpoint key and exercise the pages' error states.
 */

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export const CHANNELS = [
  {
    date: '2025-01-01',
    channel: 'podcast',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    visits: 420,
    users: 380,
    bounceRate: 0.21,
    avgDuration: 64,
    goalReaches: 12,
    conversionRate: 0.0286,
  },
  {
    date: '2025-01-02',
    channel: 'direct',
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    visits: 260,
    users: 240,
    bounceRate: 0.18,
    avgDuration: 71,
    goalReaches: 18,
    conversionRate: 0.0692,
  },
];

export const UTM = [
  {
    date: '2025-01-02',
    utmSource: 'vk',
    utmMedium: 'cpc',
    utmCampaign: 'spring',
    visits: 240,
    users: 210,
    goalReaches: 9,
    conversionRate: 0.0375,
  },
];

export const GEO_DEVICE = [
  {
    date: '2025-01-02',
    country: 'Россия',
    device: 'mobile',
    visits: 520,
    users: 470,
    goalReaches: 22,
    conversionRate: 0.0423,
  },
  {
    date: '2025-01-02',
    country: 'Россия',
    device: 'desktop',
    visits: 280,
    users: 250,
    goalReaches: 16,
    conversionRate: 0.0571,
  },
];

export const PAGES = [
  {
    date: '2025-01-02',
    page: '/lp',
    visits: 380,
    users: 340,
    bounceRate: 0.18,
    goalReaches: 14,
    conversionRate: 0.0368,
  },
];

export const EXIT_PAGES = [
  {
    date: '2025-01-02',
    page: '/checkout',
    visits: 120,
    users: 110,
    bounceRate: 0.55,
    goalReaches: 6,
    conversionRate: 0.05,
  },
];

export const DEFAULT_B2B = [
  { id: 1, company: 'BigCorp', tickets: 20, stage: 'paid', dateAdded: '2025-01-02' },
  { id: 2, company: 'MidMarket', tickets: 8, stage: 'invoiced', dateAdded: '2025-01-03' },
];

export interface MockState {
  b2b: Array<Record<string, unknown> & { id: number }>;
  hypotheses: Array<Record<string, unknown> & { id: number }>;
  decisions: Array<Record<string, unknown> & { id: number }>;
}

export interface MockOptions {
  b2b?: MockState['b2b'];
  hypotheses?: MockState['hypotheses'];
  decisions?: MockState['decisions'];
  /** Endpoint keys to fail with 500 (e.g. 'channels', 'utm', 'geo-device', 'pages', 'exit-pages'). */
  errors?: string[];
}

function future(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

/** Register all API mocks on the page. Returns the mutable state for assertions. */
export async function installMocks(page: Page, opts: MockOptions = {}): Promise<MockState> {
  const state: MockState = {
    b2b: opts.b2b ? [...opts.b2b] : [...DEFAULT_B2B],
    hypotheses: opts.hypotheses ? [...opts.hypotheses] : [],
    decisions: opts.decisions ? [...opts.decisions] : [],
  };
  const fail = new Set(opts.errors ?? []);
  let nextB2bId = 100;
  let nextHypId = 100;
  let nextDecId = 100;

  const metric = (key: string, glob: string, body: unknown): Promise<void> =>
    page.route(glob, (r) => (fail.has(key) ? json(r, { error: 'boom' }, 500) : json(r, body)));

  await metric('channels', '**/api/metrics/channels*', CHANNELS);
  await metric('utm', '**/api/metrics/utm*', UTM);
  await metric('geo-device', '**/api/metrics/geo-device*', GEO_DEVICE);
  await metric('pages', '**/api/metrics/pages*', PAGES);
  await metric('exit-pages', '**/api/metrics/exit-pages*', EXIT_PAGES);
  await metric('goals', '**/api/metrics/goals*', []);

  await page.route('**/api/metrics/raw/*', (r) => {
    const id = r.request().url().split('/').pop() ?? '';
    if (id === '999') return json(r, { error: 'not found' }, 404);
    return json(r, {
      id: Number(id),
      endpoint: '/stat/v1/data',
      queryHash: 'abc123',
      dateFrom: '2025-01-01',
      dateTo: '2025-01-02',
      payload: { data: [{ metrics: [100] }] },
      fetchedAt: '2025-01-02T00:00:00.000Z',
    });
  });

  // B2B — stateful CRUD.
  await page.route('**/api/b2b', async (r) => {
    if (r.request().method() === 'POST') {
      const body = JSON.parse(r.request().postData() ?? '{}') as Record<string, unknown>;
      const deal = { id: nextB2bId++, ...body };
      state.b2b.push(deal);
      return json(r, deal, 201);
    }
    return json(r, state.b2b);
  });
  await page.route('**/api/b2b/*', async (r) => {
    const id = Number(r.request().url().split('/').pop());
    const method = r.request().method();
    if (method === 'DELETE') {
      state.b2b = state.b2b.filter((d) => d.id !== id);
      return json(r, { ok: true });
    }
    const body = JSON.parse(r.request().postData() ?? '{}') as Record<string, unknown>;
    state.b2b = state.b2b.map((d) => (d.id === id ? { ...d, ...body } : d));
    return json(r, state.b2b.find((d) => d.id === id) ?? {});
  });

  // Hypotheses — stateful create.
  await page.route('**/api/hypotheses', async (r) => {
    if (r.request().method() === 'POST') {
      const body = JSON.parse(r.request().postData() ?? '{}') as Record<string, number | string>;
      const score = Number(body.impact) * Number(body.confidence) * Number(body.ease);
      const hyp = {
        id: nextHypId++,
        ...body,
        iceScore: score,
        status: 'draft',
        deadlineAt: future(Number(body.deadlineDays) || 7),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.hypotheses.push(hyp);
      return json(r, hyp, 201);
    }
    return json(r, state.hypotheses);
  });

  // Decisions — stateful create (also flips the linked hypothesis status to the outcome).
  await page.route('**/api/decisions', async (r) => {
    if (r.request().method() === 'POST') {
      const body = JSON.parse(r.request().postData() ?? '{}') as Record<string, unknown>;
      const dec = {
        id: nextDecId,
        number: `DL-${String(nextDecId - 99).padStart(3, '0')}`,
        ...body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      nextDecId++;
      state.decisions.push(dec);
      state.hypotheses = state.hypotheses.map((h) =>
        h.id === body.hypothesisId ? { ...h, status: body.outcome } : h,
      );
      return json(r, dec, 201);
    }
    return json(r, state.decisions);
  });

  // Report.
  await page.route('**/api/report/snapshot', (r) =>
    json(
      r,
      {
        id: 'snap-e2e',
        generatedAt: '2025-01-05T00:00:00.000Z',
        period: { from: '2025-01-01', to: '2025-01-07' },
        kpi: { target: 300, b2cApplications: 30, b2bPaidTickets: 20, gap: 280 },
        channels: CHANNELS,
        hypotheses: { problems: [], solutions: [] },
        decisions: [],
        breakdowns: { utm: UTM, geoDevice: GEO_DEVICE, entryPages: PAGES, exitPages: EXIT_PAGES },
      },
      201,
    ),
  );
  await page.route('**/api/report/insights', (r) =>
    json(r, { narrative: 'AI-анализ: визиты растут, конверсия стабильна.' }),
  );
  await page.route('**/api/report/generate', (r) => {
    const body = JSON.parse(r.request().postData() ?? '{}') as { format?: string };
    const ext = body.format === 'pdf' ? 'pdf' : 'docx';
    return json(r, { filePath: `data/reports/snap-e2e.${ext}` });
  });

  return state;
}
