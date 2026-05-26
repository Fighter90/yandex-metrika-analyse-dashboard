import { describe, it, expect, vi } from 'vitest';
import type { ReportSnapshot } from '@pca/shared';
import {
  snapshotFacts,
  buildInsightsRequest,
  parseInsights,
  generateInsights,
  ANTHROPIC_URL,
} from '../../src/report/ai-insights';

const snapshot: ReportSnapshot = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 287, b2bPaidTickets: 20, gap: 280 },
  channels: [],
  hypotheses: { problems: [], solutions: [] },
  decisions: [],
  b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
  funnel: { visits: 0, b2cApplications: 287, b2bPipelineTickets: 0, b2bPaidTickets: 20 },
  breakdowns: {
    utm: [{ source: 'vk', medium: 'cpc', campaign: 'spring', visits: 80, goalReaches: 4 }],
    geoDevice: [{ country: 'Russia', device: 'mobile', visits: 60, goalReaches: 3 }],
    entryPages: [{ page: '/reg', visits: 70, bounceRate: 0.2, goalReaches: 5 }],
    exitPages: [],
  },
};

describe('snapshotFacts', () => {
  it('includes the KPI numbers and the top breakdown rows', () => {
    const facts = snapshotFacts(snapshot);
    expect(facts).toContain('287');
    expect(facts).toContain('vk/cpc/spring');
    expect(facts).toContain('Russia/mobile');
  });

  it('renders "—" for a breakdown with no rows', () => {
    const empty = snapshotFacts({
      ...snapshot,
      breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
    });
    expect(empty).toContain('Топ UTM: —');
  });
});

describe('buildInsightsRequest', () => {
  it('builds an Anthropic request grounded in the snapshot, with an anti-hallucination system prompt', () => {
    const req = buildInsightsRequest(snapshot, 'claude-sonnet-4-6');
    expect(req.model).toBe('claude-sonnet-4-6');
    expect(req.system).toContain('ТОЛЬКО');
    expect(req.messages[0]?.content).toContain('snap-1');
    expect(req.max_tokens).toBeGreaterThan(0);
  });
});

describe('parseInsights', () => {
  it('joins text content blocks and ignores non-text blocks', () => {
    const raw = JSON.stringify({
      content: [
        { type: 'text', text: 'Итог: рост.' },
        { type: 'tool_use' },
        { type: 'text' }, // text block without a text field → contributes ''
        { type: 'text', text: 'Рекомендации: …' },
      ],
    });
    expect(parseInsights(raw)).toBe('Итог: рост.\n\nРекомендации: …');
  });

  it('throws on a body that does not match the schema', () => {
    expect(() => parseInsights('{"unexpected":true}')).toThrow(/schema/);
  });
});

describe('generateInsights', () => {
  it('POSTs to Anthropic with auth headers and returns the narrative', async () => {
    // Mock 10 chunk responses (one per section)
    const doFetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ content: [{ type: 'text', text: `## Section\n\nанализ` }] }),
    }));
    const out = await generateInsights(doFetch, {
      apiKey: 'sk-test',
      model: 'claude-sonnet-4-6',
      snapshot,
    });
    // Should contain 10 sections joined together
    expect(out).toContain('## Section');
    expect(out).toContain('анализ');
    expect(doFetch).toHaveBeenCalledTimes(10);
    const call = doFetch.mock.calls[0];
    expect(call?.[0]).toBe(ANTHROPIC_URL);
    expect(call?.[1].headers['x-api-key']).toBe('sk-test');
    expect(call?.[1].headers['anthropic-version']).toBeTruthy();
  });

  it('handles partial failures (some chunks fail, others succeed)', async () => {
    let callCount = 0;
    const doFetch = vi.fn(async () => {
      callCount++;
      if (callCount <= 2) {
        // First 2 chunks fail
        return { ok: false, status: 401, text: async () => '{"error":"auth"}' };
      }
      // Rest succeed
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ content: [{ type: 'text', text: `## Section\n\nанализ` }] }),
      };
    });
    const out = await generateInsights(doFetch, {
      apiKey: 'bad',
      model: 'm',
      snapshot,
    });
    // Should still return output with error messages for failed chunks
    expect(out).toContain('Ошибка генерации');
    expect(out).toContain('анализ');
  });
});
