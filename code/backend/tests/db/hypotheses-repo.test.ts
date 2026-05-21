import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DB } from '../../src/db/connection';
import {
  HypothesesRepo,
  HypothesisValidationError,
} from '../../src/db/repositories/hypotheses-repo';
import { freshDb, validHypothesis } from './helpers';

let db: DB;
let repo: HypothesesRepo;

beforeEach(() => {
  db = freshDb();
  repo = new HypothesesRepo(db);
});
afterEach(() => db.close());

describe('HypothesesRepo.create', () => {
  it('persists a full hypothesis and computes ice_score as the product', () => {
    const h = repo.create(
      validHypothesis({
        impact: 8,
        confidence: 5,
        ease: 7,
        description: 'desc',
        parentId: undefined,
        evidence: [{ type: 'quantitative', rawResponseId: 1, note: 'n' }],
      }),
    );
    expect(h.id).toBeGreaterThan(0);
    expect(h.iceScore).toBe(280);
    expect(h.status).toBe('draft');
    expect(h.description).toBe('desc');
    expect(h.evidence?.[0]?.rawResponseId).toBe(1);
    expect(new Date(h.deadlineAt).getTime()).toBeGreaterThan(new Date(h.createdAt).getTime());
  });

  it('persists a minimal hypothesis (no description / parent / evidence)', () => {
    const h = repo.create(validHypothesis());
    expect(h.description).toBeUndefined();
    expect(h.parentId).toBeUndefined();
    expect(h.evidence).toBeUndefined();
  });

  it('links a solution hypothesis to its parent problem', () => {
    const problem = repo.create(validHypothesis());
    const solution = repo.create(
      validHypothesis({ kind: 'solution', diamondPhase: 'develop', parentId: problem.id }),
    );
    expect(solution.parentId).toBe(problem.id);
  });

  it('rejects a hypothesis with fewer than 3 assumptions', () => {
    expect(() =>
      repo.create(validHypothesis({ hiddenAssumptions: [{ category: 'behavior', text: 'x' }] })),
    ).toThrowError(HypothesisValidationError);
  });

  it('rejects a hypothesis with fewer than 2 validation methods', () => {
    try {
      repo.create(validHypothesis({ validationMethods: [{ type: 'synthetic', plan: 'x' }] }));
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HypothesisValidationError);
      expect((e as HypothesisValidationError).errors.length).toBeGreaterThan(0);
    }
  });
});

describe('HypothesesRepo reads & status', () => {
  it('getById returns a hypothesis or undefined', () => {
    const h = repo.create(validHypothesis());
    expect(repo.getById(h.id)?.id).toBe(h.id);
    expect(repo.getById(9999)).toBeUndefined();
  });

  it('lists hypotheses by ICE descending', () => {
    repo.create(validHypothesis({ impact: 2, confidence: 2, ease: 2 })); // 8
    repo.create(validHypothesis({ impact: 9, confidence: 9, ease: 9 })); // 729
    expect(repo.list().map((h) => h.iceScore)).toEqual([729, 8]);
  });

  it('updateStatus updates an existing hypothesis and returns undefined for a missing one', () => {
    const h = repo.create(validHypothesis());
    const updated = repo.updateStatus(h.id, 'in_progress');
    expect(updated?.status).toBe('in_progress');
    expect(repo.updateStatus(9999, 'green')).toBeUndefined();
  });
});
