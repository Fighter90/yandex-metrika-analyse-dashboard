import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildTestApp, type TestApp } from './helpers';
import { validHypothesis } from '../db/helpers';
import type { NewDecision } from '@pca/shared';

let ctx: TestApp;
let hypothesisId: number;

beforeEach(() => {
  ctx = buildTestApp();
  hypothesisId = ctx.deps.hypotheses.create(validHypothesis()).id;
});
afterEach(async () => {
  await ctx.app.close();
  ctx.db.close();
});

function decision(over: Partial<NewDecision> = {}): NewDecision {
  return {
    hypothesisId,
    date: '2025-01-10',
    method: 'mixed',
    scope: '5 интервью',
    periodDays: 5,
    findings: [{ text: 'finding', confidence: 'medium' }],
    evidence: [{ quote: 'q', source: 's', rawResponseId: 1 }],
    outcome: 'yellow',
    outcomeRationale: 'partial',
    nextStep: 'next',
    decidedBy: 'team',
    ...over,
  };
}

describe('decisions API', () => {
  it('creates a decision (201), updating the hypothesis status, and lists/reads it', async () => {
    const created = await ctx.app.inject({
      method: 'POST',
      url: '/api/decisions',
      payload: decision(),
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().number).toBe('DL-001');
    expect(ctx.deps.hypotheses.getById(hypothesisId)?.status).toBe('yellow');

    const list = await ctx.app.inject({ method: 'GET', url: '/api/decisions' });
    expect(list.json()).toHaveLength(1);

    const one = await ctx.app.inject({ method: 'GET', url: `/api/decisions/${created.json().id}` });
    expect(one.statusCode).toBe(200);
    const missing = await ctx.app.inject({ method: 'GET', url: '/api/decisions/9999' });
    expect(missing.statusCode).toBe(404);
  });

  it('rejects a decision without evidence (422)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/decisions',
      payload: decision({ evidence: [] }),
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error).toBe('invalid decision');
  });

  it('returns 500 on a non-validation error (bad hypothesis FK)', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/decisions',
      payload: decision({ hypothesisId: 9999 }),
    });
    expect(res.statusCode).toBe(500);
  });
});
