import { describe, it, expect } from 'vitest';
import { buildSeedData } from '../../src/db/seed-data';

describe('buildSeedData', () => {
  it('is deterministic — same output every call', () => {
    expect(buildSeedData()).toEqual(buildSeedData());
  });

  it('populates every dataset the dashboard pages read', () => {
    const d = buildSeedData();
    expect(d.channels.length).toBeGreaterThan(0);
    expect(d.utm.length).toBeGreaterThan(0);
    expect(d.geoDevice.length).toBeGreaterThan(0);
    expect(d.pages.length).toBeGreaterThan(0);
    expect(d.exitPages.length).toBeGreaterThan(0);
    expect(d.b2b.length).toBeGreaterThan(0);
    expect(d.goals.length).toBeGreaterThan(0);
  });

  it('keeps «заявка ≠ оплата» realistic: exactly one paid B2B deal, several applications', () => {
    const d = buildSeedData();
    const paid = d.b2b.filter((b) => b.stage === 'paid');
    expect(paid).toHaveLength(1);
    expect(paid[0]?.datePaid).toBeDefined();
    const totalReaches = d.channels.reduce((acc, c) => acc + c.goalReaches, 0);
    expect(totalReaches).toBeGreaterThan(paid[0]?.tickets ?? 0);
  });

  it('produces consistent ChannelStat rows (conversionRate = reaches / visits, archived goal flagged)', () => {
    const d = buildSeedData();
    for (const c of d.channels) {
      expect(c.conversionRate).toBeCloseTo(c.goalReaches / c.visits);
      expect(c.users).toBe(Math.round(c.visits * 0.9));
    }
    expect(d.goals.some((g) => g.isArchived)).toBe(true);
  });
});
