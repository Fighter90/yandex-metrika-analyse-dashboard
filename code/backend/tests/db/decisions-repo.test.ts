import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DB } from '../../src/db/connection';
import { HypothesesRepo } from '../../src/db/repositories/hypotheses-repo';
import {
  DecisionsRepo,
  DecisionValidationError,
} from '../../src/db/repositories/decisions-repo';
import { freshDb, validHypothesis } from './helpers';
import type { NewDecision } from '@pca/shared';

let db: DB;
let hyps: HypothesesRepo;
let decisions: DecisionsRepo;

beforeEach(() => {
  db = freshDb();
  hyps = new HypothesesRepo(db);
  decisions = new DecisionsRepo(db);
});
afterEach(() => db.close());

function decisionFor(hypothesisId: number, over: Partial<NewDecision> = {}): NewDecision {
  return {
    hypothesisId,
    date: '2025-01-10',
    method: 'mixed',
    scope: '5 интервью + 12k сессий',
    periodDays: 5,
    findings: [{ text: 'подкаст конвертит хуже', confidence: 'medium' }],
    evidence: [{ quote: 'если надо счёт — отложу', source: 'synthetic CTO', rawResponseId: 1 }],
    outcome: 'yellow',
    outcomeRationale: 'разрыв подтверждён частично',
    nextStep: 'solution: онлайн-оплата',
    decidedBy: 'команда трека',
    ...over,
  };
}

describe('DecisionsRepo.create', () => {
  it('numbers decisions sequentially and auto-updates the linked hypothesis status', () => {
    const h = hyps.create(validHypothesis());
    const d1 = decisions.create(decisionFor(h.id, { outcome: 'yellow' }));
    expect(d1.number).toBe('DL-001');
    expect(hyps.getById(h.id)?.status).toBe('yellow');

    const h2 = hyps.create(validHypothesis());
    const d2 = decisions.create(
      decisionFor(h2.id, { outcome: 'green', spawnedHypothesisIds: [h.id], responsible: 'Лиза' }),
    );
    expect(d2.number).toBe('DL-002');
    expect(d2.spawnedHypothesisIds).toEqual([h.id]);
    expect(d2.responsible).toBe('Лиза');
    expect(hyps.getById(h2.id)?.status).toBe('green');
  });

  it('maps optional fields to undefined when absent', () => {
    const h = hyps.create(validHypothesis());
    const d = decisions.create(decisionFor(h.id));
    expect(d.responsible).toBeUndefined();
    expect(d.spawnedHypothesisIds).toBeUndefined();
    expect(d.previousDecisionId).toBeUndefined();
  });

  it('requires at least one evidence item', () => {
    const h = hyps.create(validHypothesis());
    expect(() => decisions.create(decisionFor(h.id, { evidence: [] }))).toThrowError(
      DecisionValidationError,
    );
  });

  it('rejects a decision for a non-existent hypothesis (FK)', () => {
    expect(() => decisions.create(decisionFor(9999))).toThrow();
  });
});

describe('DecisionsRepo reads', () => {
  it('getById, list and listByHypothesis', () => {
    const h = hyps.create(validHypothesis());
    const d = decisions.create(decisionFor(h.id));
    expect(decisions.getById(d.id)?.number).toBe('DL-001');
    expect(decisions.getById(9999)).toBeUndefined();
    expect(decisions.list()).toHaveLength(1);
    expect(decisions.listByHypothesis(h.id)).toHaveLength(1);
    expect(decisions.listByHypothesis(9999)).toHaveLength(0);
  });
});
