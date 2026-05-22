import { describe, it, expect, vi } from 'vitest';
import { iceScore } from '@pca/shared';
import type { ReportSnapshot } from '@pca/shared';
import {
  buildHypothesesRequest,
  parseHypotheses,
  generateHypotheses,
  ANTHROPIC_URL,
  type AnthropicFetch,
} from '../../src/report/ai-hypotheses';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const snapshot: ReportSnapshot = {
  id: 'snap-hyp-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 287, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: { problems: [], solutions: [] },
  decisions: [],
  breakdowns: {
    utm: [{ source: 'vk', medium: 'cpc', campaign: 'spring', visits: 80, goalReaches: 4 }],
    geoDevice: [{ country: 'Russia', device: 'mobile', visits: 60, goalReaches: 3 }],
    entryPages: [{ page: '/reg', visits: 70, bounceRate: 0.2, goalReaches: 5 }],
    exitPages: [],
  },
};

/** Build a minimal valid raw hypotheses payload (as the AI would return — no ice.score). */
function makeProblem(id: string) {
  return {
    id,
    segment: 'Мобильный пользователь из России',
    trouble: 'высокий показатель отказов',
    action: 'заполнении формы регистрации',
    barrier: 'форма не адаптирована для мобильных устройств',
    evidence: '287 заявок B2C при 60 визитах с мобильных',
  };
}

function makeSolution(id: string, problemId: string) {
  return {
    id,
    problemId,
    action: 'адаптируем форму для мобильных',
    userBenefit: 'легко заполнить форму с телефона',
    businessResult: 'рост конверсии посетителей в заявки',
    successCriteria: 'CR с мобильных вырастет на 10% за 2 недели',
    risks: [
      { kind: 'value', note: 'пользователи могут не оценить изменение' },
      { kind: 'usability', note: 'новый дизайн может быть непривычным' },
      { kind: 'feasibility', note: 'требует переработки фронтенда' },
      { kind: 'business', note: 'рост затрат на разработку' },
      { kind: 'legal', note: 'нет юридических ограничений' },
    ],
    validation: {
      whatToVerify: 'увеличение CR с мобильных',
      methods: ['клик-тест на прототипе', 'A/B-тест'],
      audience: 'новые посетители с мобильных',
      channel: 'органический трафик из VK',
      successCriteria: '≥10% прирост CR',
    },
    ice: {
      impact: 8,
      confidence: 7,
      ease: 6,
      impactRationale: 'высокая доля мобильного трафика',
      confidenceRationale: 'данные из Метрики подтверждают проблему',
      easeRationale: 'стандартная адаптация формы',
    },
  };
}

/** Build a full raw payload with exactly N problems and M solutions. */
function makeRawPayload(numProblems: number, numSolutions: number): unknown {
  const problems = Array.from({ length: numProblems }, (_, i) =>
    makeProblem(`P${String(i + 1).padStart(2, '0')}`),
  );
  const solutions = Array.from({ length: numSolutions }, (_, i) =>
    makeSolution(`S${String(i + 1).padStart(2, '0')}`, problems[i % problems.length]!.id),
  );
  return { problems, solutions };
}

function fakeFetch(res: { ok: boolean; status: number; body: string }): AnthropicFetch {
  return vi.fn(async () => ({ ok: res.ok, status: res.status, text: async () => res.body }));
}

/** Wrap raw hypotheses payload inside an Anthropic Messages envelope. */
function anthropicEnvelope(payload: unknown): string {
  return JSON.stringify({
    content: [{ type: 'text', text: JSON.stringify(payload) }],
  });
}

// ---------------------------------------------------------------------------
// buildHypothesesRequest
// ---------------------------------------------------------------------------

describe('buildHypothesesRequest', () => {
  it('returns a request with the correct model and max_tokens', () => {
    const req = buildHypothesesRequest(snapshot, 'claude-sonnet-4-6');
    expect(req.model).toBe('claude-sonnet-4-6');
    expect(req.max_tokens).toBeGreaterThan(0);
  });

  it('includes the snapshot id in the user message', () => {
    const req = buildHypothesesRequest(snapshot, 'claude-sonnet-4-6');
    expect(req.messages[0]?.content).toContain('snap-hyp-1');
  });

  it('references key snapshot numbers in the user message', () => {
    const req = buildHypothesesRequest(snapshot, 'claude-sonnet-4-6');
    // snapshotFacts embeds the KPI numbers and UTM data
    expect(req.messages[0]?.content).toContain('287');
    expect(req.messages[0]?.content).toContain('vk/cpc/spring');
  });

  it('has an anti-hallucination system prompt with the "заявка ≠ оплата" principle', () => {
    const req = buildHypothesesRequest(snapshot, 'claude-sonnet-4-6');
    expect(req.system).toContain('заявка ≠ оплата');
    expect(req.system).toContain('ТОЛЬКО');
  });

  it('instructs the model to produce at least 10 problems and 10 solutions', () => {
    const req = buildHypothesesRequest(snapshot, 'claude-sonnet-4-6');
    expect(req.system).toContain('≥10');
    expect(req.messages[0]?.content).toContain('минимум 10');
  });

  it('requires JSON-only output (no markdown wrapper)', () => {
    const req = buildHypothesesRequest(snapshot, 'claude-sonnet-4-6');
    expect(req.system).toContain('JSON');
    expect(req.system).toContain('markdown');
  });

  it('specifies all 5 risk kinds in the system prompt', () => {
    const req = buildHypothesesRequest(snapshot, 'claude-sonnet-4-6');
    expect(req.system).toContain('"value"');
    expect(req.system).toContain('"usability"');
    expect(req.system).toContain('"feasibility"');
    expect(req.system).toContain('"business"');
    expect(req.system).toContain('"legal"');
  });

  it('role is always "user"', () => {
    const req = buildHypothesesRequest(snapshot, 'm');
    expect(req.messages[0]?.role).toBe('user');
  });
});

// ---------------------------------------------------------------------------
// parseHypotheses
// ---------------------------------------------------------------------------

describe('parseHypotheses', () => {
  it('parses valid JSON with ≥10 problems and ≥10 solutions and computes ice.score', () => {
    const raw = JSON.stringify(makeRawPayload(10, 10));
    const result = parseHypotheses(raw);

    expect(result.problems).toHaveLength(10);
    expect(result.solutions).toHaveLength(10);

    const s = result.solutions[0]!;
    const expectedScore = iceScore(s.ice.impact, s.ice.confidence, s.ice.ease);
    expect(s.ice.score).toBe(expectedScore);
    // Sanity-check the formula (8 * 7 * 6 = 336)
    expect(s.ice.score).toBe(336);
  });

  it('computes ice.score deterministically regardless of AI text', () => {
    const raw = JSON.stringify(makeRawPayload(10, 10));
    const result = parseHypotheses(raw);
    for (const s of result.solutions) {
      expect(s.ice.score).toBe(s.ice.impact * s.ice.confidence * s.ice.ease);
    }
  });

  it('preserves all problem fields intact', () => {
    const raw = JSON.stringify(makeRawPayload(10, 10));
    const result = parseHypotheses(raw);
    const p = result.problems[0]!;
    expect(p.id).toBe('P01');
    expect(p.segment).toContain('Мобильный');
    expect(p.evidence).toBeTruthy();
  });

  it('preserves all solution fields intact', () => {
    const raw = JSON.stringify(makeRawPayload(10, 10));
    const result = parseHypotheses(raw);
    const s = result.solutions[0]!;
    expect(s.risks).toHaveLength(5);
    expect(s.validation.methods.length).toBeGreaterThanOrEqual(2);
    expect(s.validation.successCriteria).toBeTruthy();
  });

  it('accepts more than 10 problems and solutions', () => {
    const raw = JSON.stringify(makeRawPayload(12, 15));
    const result = parseHypotheses(raw);
    expect(result.problems).toHaveLength(12);
    expect(result.solutions).toHaveLength(15);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseHypotheses('not-json')).toThrow('AI returned invalid JSON for hypotheses');
  });

  it('throws when there are fewer than 10 problems', () => {
    const raw = JSON.stringify(makeRawPayload(9, 10));
    expect(() => parseHypotheses(raw)).toThrow(/schema/);
  });

  it('throws when there are fewer than 10 solutions', () => {
    const raw = JSON.stringify(makeRawPayload(10, 9));
    expect(() => parseHypotheses(raw)).toThrow(/schema/);
  });

  it('throws when a risk kind is missing or invalid', () => {
    const payload = makeRawPayload(10, 10) as {
      solutions: Array<{ risks: Array<{ kind: string; note: string }> }>;
    };
    // Replace risks with only 4 entries (drop "legal")
    payload.solutions[0]!.risks = payload.solutions[0]!.risks.slice(0, 4);
    expect(() => parseHypotheses(JSON.stringify(payload))).toThrow(/schema/);
  });

  it('throws when an ICE factor is out of range', () => {
    const payload = makeRawPayload(10, 10) as {
      solutions: Array<{ ice: { impact: number; confidence: number; ease: number } }>;
    };
    payload.solutions[0]!.ice.impact = 11; // out of 1–10 range
    expect(() => parseHypotheses(JSON.stringify(payload))).toThrow(/schema/);
  });

  it('throws when validation has fewer than 2 methods', () => {
    const payload = makeRawPayload(10, 10) as {
      solutions: Array<{ validation: { methods: string[] } }>;
    };
    payload.solutions[0]!.validation.methods = ['только один метод'];
    expect(() => parseHypotheses(JSON.stringify(payload))).toThrow(/schema/);
  });

  it('throws when the JSON object is completely wrong shape', () => {
    expect(() => parseHypotheses('{"unexpected":true}')).toThrow(/schema/);
  });
});

// ---------------------------------------------------------------------------
// generateHypotheses
// ---------------------------------------------------------------------------

describe('generateHypotheses', () => {
  it('POSTs to Anthropic with the correct auth headers and returns parsed hypotheses', async () => {
    const payload = makeRawPayload(10, 10);
    const doFetch = fakeFetch({ ok: true, status: 200, body: anthropicEnvelope(payload) });

    const result = await generateHypotheses(snapshot, {
      fetch: doFetch,
      apiKey: 'sk-test',
      model: 'claude-sonnet-4-6',
    });

    expect(result.problems).toHaveLength(10);
    expect(result.solutions).toHaveLength(10);

    const call = vi.mocked(doFetch).mock.calls[0];
    expect(call?.[0]).toBe(ANTHROPIC_URL);
    expect(call?.[1].headers['x-api-key']).toBe('sk-test');
    expect(call?.[1].headers['anthropic-version']).toBeTruthy();
    expect(call?.[1].headers['content-type']).toBe('application/json');
  });

  it('includes the request body with model and messages', async () => {
    const payload = makeRawPayload(10, 10);
    const doFetch = fakeFetch({ ok: true, status: 200, body: anthropicEnvelope(payload) });

    await generateHypotheses(snapshot, {
      fetch: doFetch,
      apiKey: 'sk-test',
      model: 'test-model',
    });

    const call = vi.mocked(doFetch).mock.calls[0];
    const body = JSON.parse(call?.[1].body ?? '{}') as { model: string; messages: unknown[] };
    expect(body.model).toBe('test-model');
    expect(body.messages).toHaveLength(1);
  });

  it('throws on a non-2xx Anthropic response', async () => {
    const doFetch = fakeFetch({ ok: false, status: 401, body: '{"error":"auth"}' });

    await expect(
      generateHypotheses(snapshot, { fetch: doFetch, apiKey: 'bad', model: 'm' }),
    ).rejects.toThrow(/HTTP 401/);
  });

  it('throws when the Anthropic envelope does not match the expected schema', async () => {
    const doFetch = fakeFetch({ ok: true, status: 200, body: '{"unexpected":true}' });

    await expect(
      generateHypotheses(snapshot, { fetch: doFetch, apiKey: 'sk', model: 'm' }),
    ).rejects.toThrow(/envelope/);
  });

  it('throws when the model JSON inside the envelope is invalid', async () => {
    const envelope = JSON.stringify({
      content: [{ type: 'text', text: 'not-valid-json' }],
    });
    const doFetch = fakeFetch({ ok: true, status: 200, body: envelope });

    await expect(
      generateHypotheses(snapshot, { fetch: doFetch, apiKey: 'sk', model: 'm' }),
    ).rejects.toThrow('AI returned invalid JSON for hypotheses');
  });

  it('throws when the model returns fewer than 10 problems inside the envelope', async () => {
    const envelope = anthropicEnvelope(makeRawPayload(5, 10));
    const doFetch = fakeFetch({ ok: true, status: 200, body: envelope });

    await expect(
      generateHypotheses(snapshot, { fetch: doFetch, apiKey: 'sk', model: 'm' }),
    ).rejects.toThrow(/schema/);
  });

  it('computes ice.score deterministically even when the model omits it', async () => {
    const payload = makeRawPayload(10, 10);
    const doFetch = fakeFetch({ ok: true, status: 200, body: anthropicEnvelope(payload) });

    const result = await generateHypotheses(snapshot, {
      fetch: doFetch,
      apiKey: 'sk',
      model: 'm',
    });

    for (const s of result.solutions) {
      expect(s.ice.score).toBe(s.ice.impact * s.ice.confidence * s.ice.ease);
    }
  });

  it('concatenates multiple text content blocks before parsing', async () => {
    // Some Anthropic calls produce multiple text blocks; they should be joined before parse.
    const halfA = JSON.stringify(makeRawPayload(10, 10));
    // Split into two blocks — the second block is empty, first is the full JSON.
    const envelope = JSON.stringify({
      content: [
        { type: 'text', text: halfA },
        { type: 'tool_use' }, // non-text block — should be ignored
        { type: 'text' }, // text block without text field — contributes ''
      ],
    });
    const doFetch = fakeFetch({ ok: true, status: 200, body: envelope });

    const result = await generateHypotheses(snapshot, {
      fetch: doFetch,
      apiKey: 'sk',
      model: 'm',
    });

    expect(result.problems).toHaveLength(10);
  });
});
