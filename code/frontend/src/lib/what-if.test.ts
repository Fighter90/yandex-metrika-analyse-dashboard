import { describe, it, expect } from 'vitest';
import { simulatePayments } from './what-if';

const base = {
  visits: 1000,
  applications: 100,
  b2bPaid: 20,
  target: 300,
  extraVisitsPct: 0,
  crUpliftPct: 0,
};

describe('simulatePayments', () => {
  it('reproduces the baseline when both levers are 0', () => {
    const r = simulatePayments(base);
    // baseCR = 0.1, newVisits = 1000, projectedApplications = 100
    expect(r.projectedApplications).toBe(100);
    expect(r.projectedPayments).toBe(120); // 20 b2b + 100
    expect(r.gapAfter).toBe(180); // 300 - 120
    expect(r.addedVsNow).toBe(0);
  });

  it('guards division by zero when visits is 0', () => {
    const r = simulatePayments({ ...base, visits: 0, applications: 0 });
    expect(r.projectedApplications).toBe(0);
    expect(r.projectedPayments).toBe(20); // only b2b
    expect(r.gapAfter).toBe(280);
    expect(r.addedVsNow).toBe(0);
  });

  it('scales applications with extra traffic', () => {
    const r = simulatePayments({ ...base, extraVisitsPct: 50 });
    // newVisits = 1500, CR 0.1 → 150 applications
    expect(r.projectedApplications).toBe(150);
    expect(r.addedVsNow).toBe(50);
  });

  it('scales applications with a CR uplift', () => {
    const r = simulatePayments({ ...base, crUpliftPct: 20 });
    // CR 0.1 × 1.2 = 0.12 → 1000 × 0.12 = 120
    expect(r.projectedApplications).toBe(120);
    expect(r.addedVsNow).toBe(20);
  });

  it('caps the conversion rate at 100% even with a huge uplift', () => {
    // baseCR = 0.5, ×1000% uplift would exceed 1 → clamp to 1.0
    const r = simulatePayments({
      ...base,
      visits: 100,
      applications: 50,
      crUpliftPct: 1000,
    });
    // newCR clamped to 1 → projectedApplications = 100 (= visits)
    expect(r.projectedApplications).toBe(100);
  });

  it('is monotonic: more traffic never reduces projected applications', () => {
    const low = simulatePayments({ ...base, extraVisitsPct: 10 });
    const high = simulatePayments({ ...base, extraVisitsPct: 40 });
    expect(high.projectedApplications).toBeGreaterThanOrEqual(low.projectedApplications);
  });

  it('floors the gap at 0 when projected payments exceed the target', () => {
    const r = simulatePayments({
      ...base,
      visits: 10000,
      applications: 5000,
      target: 300,
    });
    expect(r.gapAfter).toBe(0);
    expect(r.projectedPayments).toBeGreaterThan(300);
  });
});
