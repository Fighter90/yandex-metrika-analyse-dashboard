import { describe, it, expect, vi } from 'vitest';
import type { ReportSnapshot, GeneratedHypotheses } from '@pca/shared';
import {
  buildDecisionsRequest,
  parseDecisions,
  generateDecisions,
  ANTHROPIC_URL,
  type AnthropicFetch,
} from '../../src/report/ai-decisions';

const snapshot: ReportSnapshot = {
  id: 'snap-dec-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 287, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: { problems: [], solutions: [] },
  decisions: [],
  b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
  funnel: { visits: 0, b2cApplications: 287, b2bPipelineTickets: 0, b2bPaidTickets: 20 },
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

const hypotheses: GeneratedHypotheses = {
  problems: [
    { id: 'P01', segment: 'моб', trouble: 't', action: 'a', barrier: 'b', evidence: '287 заявок' },
  ],
  solutions: [],
};

function makeDecision(id: string) {
  return {
    id,
    hypothesisId: 'P01',
    method: 'количественный анализ',
    periodDays: 14,
    scope: 'мобильный сегмент',
    findings: 'CR с мобильных ниже среднего',
    confidence: 'medium' as const,
    evidence: '287 заявок B2C',
    source: 'snap-dec-1',
    outcome: 'yellow' as const,
    outcomeRationale: 'нужна доработка формы перед масштабированием',
  };
}

function makeRawPayload(n: number): unknown {
  return { decisions: Array.from({ length: n }, (_, i) => makeDecision(`DL${i + 1}`)) };
}

function fakeFetch(res: { ok: boolean; status: number; body: string }): AnthropicFetch {
  return vi.fn(async () => ({ ok: res.ok, status: res.status, text: async () => res.body }));
}

function anthropicEnvelope(payload: unknown): string {
  return JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(payload) }] });
}

describe('buildDecisionsRequest', () => {
  it('returns a request with model + max_tokens and the snapshot id in the user message', () => {
    const req = buildDecisionsRequest(snapshot, hypotheses, 'claude-x');
    expect(req.model).toBe('claude-x');
    expect(req.max_tokens).toBeGreaterThan(0);
    expect(req.messages[0]?.content).toContain('snap-dec-1');
  });

  it('lists available hypothesis ids and enforces ≥3 + JSON-only + заявка≠оплата', () => {
    const req = buildDecisionsRequest(snapshot, hypotheses, 'm');
    expect(req.messages[0]?.content).toContain('P01');
    expect(req.system).toContain('заявка ≠ оплата');
    expect(req.system).toMatch(/JSON/);
    expect(req.messages[0]?.content).toContain('минимум 3');
  });
});

describe('parseDecisions', () => {
  it('parses valid JSON with ≥3 decisions', () => {
    const out = parseDecisions(JSON.stringify(makeRawPayload(3)));
    expect(out.decisions).toHaveLength(3);
    expect(out.decisions[0]?.outcome).toBe('yellow');
  });

  it('accepts more than 3 decisions', () => {
    expect(parseDecisions(JSON.stringify(makeRawPayload(5))).decisions).toHaveLength(5);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseDecisions('not json')).toThrow(/invalid JSON/);
  });

  it('throws when there are fewer than 3 decisions', () => {
    expect(() => parseDecisions(JSON.stringify(makeRawPayload(2)))).toThrow(/schema/);
  });

  it('throws when a decision field is missing/invalid', () => {
    const bad = {
      decisions: [
        { ...makeDecision('DL1'), outcome: 'purple' },
        makeDecision('DL2'),
        makeDecision('DL3'),
      ],
    };
    expect(() => parseDecisions(JSON.stringify(bad))).toThrow(/schema/);
  });

  it('throws when periodDays is not a positive integer', () => {
    const bad = {
      decisions: [
        { ...makeDecision('DL1'), periodDays: 0 },
        makeDecision('DL2'),
        makeDecision('DL3'),
      ],
    };
    expect(() => parseDecisions(JSON.stringify(bad))).toThrow(/schema/);
  });
});

describe('generateDecisions', () => {
  it('returns parsed decisions on a successful Anthropic call', async () => {
    const fetch = fakeFetch({ ok: true, status: 200, body: anthropicEnvelope(makeRawPayload(3)) });
    const out = await generateDecisions(snapshot, hypotheses, { fetch, apiKey: 'k', model: 'm' });
    expect(out.decisions).toHaveLength(3);
    expect(fetch).toHaveBeenCalledWith(ANTHROPIC_URL, expect.objectContaining({ method: 'POST' }));
  });

  it('throws on a non-2xx response', async () => {
    const fetch = fakeFetch({ ok: false, status: 500, body: 'boom' });
    await expect(
      generateDecisions(snapshot, hypotheses, { fetch, apiKey: 'k', model: 'm' }),
    ).rejects.toThrow(/HTTP 500/);
  });

  it('throws when the response envelope is malformed', async () => {
    const fetch = fakeFetch({ ok: true, status: 200, body: JSON.stringify({ nope: 1 }) });
    await expect(
      generateDecisions(snapshot, hypotheses, { fetch, apiKey: 'k', model: 'm' }),
    ).rejects.toThrow(/envelope/);
  });

  it('concatenates only text content blocks (ignoring a text block with no text field)', async () => {
    const body = JSON.stringify({
      content: [
        { type: 'thinking', text: 'ignore me' },
        { type: 'text' }, // no text field → exercises the `?? ''` fallback
        { type: 'text', text: JSON.stringify(makeRawPayload(3)) },
      ],
    });
    const fetch = fakeFetch({ ok: true, status: 200, body });
    const out = await generateDecisions(snapshot, hypotheses, { fetch, apiKey: 'k', model: 'm' });
    expect(out.decisions).toHaveLength(3);
  });
});
