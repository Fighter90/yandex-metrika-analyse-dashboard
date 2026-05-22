import { describe, it, expect } from 'vitest';
import { validateHypothesis } from '@pca/shared';
import { buildSeedHypotheses, buildSeedDecisions } from '../../src/db/seed-hypotheses';

describe('buildSeedHypotheses', () => {
  it('is deterministic — same output every call', () => {
    expect(buildSeedHypotheses()).toEqual(buildSeedHypotheses());
  });

  it('provides several problem and solution hypotheses for a detailed report', () => {
    const hs = buildSeedHypotheses();
    expect(hs.filter((h) => h.kind === 'problem').length).toBeGreaterThanOrEqual(3);
    expect(hs.filter((h) => h.kind === 'solution').length).toBeGreaterThanOrEqual(3);
  });

  it('every seed hypothesis passes the Voronkova validation (loadable via the repo)', () => {
    for (const h of buildSeedHypotheses()) {
      const result = validateHypothesis(h);
      expect(result.errors).toEqual([]);
      expect(result.ok).toBe(true);
    }
  });

  it('parent references point to earlier hypotheses (1-based index)', () => {
    const hs = buildSeedHypotheses();
    for (const [i, h] of hs.entries()) {
      if (h.parentId !== undefined) {
        expect(h.parentId).toBeGreaterThanOrEqual(1);
        expect(h.parentId).toBeLessThanOrEqual(i); // strictly before this one
      }
    }
  });
});

describe('buildSeedDecisions', () => {
  it('is deterministic and references valid seed-hypothesis indices with evidence', () => {
    const ds = buildSeedDecisions();
    const count = buildSeedHypotheses().length;
    expect(buildSeedDecisions()).toEqual(ds);
    expect(ds.length).toBeGreaterThan(0);
    for (const d of ds) {
      expect(d.hypothesisId).toBeGreaterThanOrEqual(1);
      expect(d.hypothesisId).toBeLessThanOrEqual(count);
      expect(d.evidence.length).toBeGreaterThan(0); // repo rejects evidence-less decisions
    }
  });
});
