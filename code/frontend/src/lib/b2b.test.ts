import { describe, it, expect } from 'vitest';
import type { B2bDeal } from '@pca/shared';
import { pipelineSummary, B2B_STAGES } from './b2b';

function deal(over: Partial<B2bDeal>): B2bDeal {
  return { id: 1, company: 'Acme', tickets: 10, stage: 'lead', dateAdded: '2025-01-01', ...over };
}

describe('pipelineSummary', () => {
  it('counts deals and tickets per stage with totals', () => {
    const s = pipelineSummary([
      deal({ id: 1, stage: 'lead', tickets: 5 }),
      deal({ id: 2, stage: 'paid', tickets: 20 }),
      deal({ id: 3, stage: 'paid', tickets: 15 }),
    ]);
    expect(s.totalTickets).toBe(40);
    expect(s.paidTickets).toBe(35);
    expect(s.byStage.find((x) => x.stage === 'paid')).toEqual({
      stage: 'paid',
      deals: 2,
      tickets: 35,
    });
    expect(s.byStage.find((x) => x.stage === 'negotiation')).toEqual({
      stage: 'negotiation',
      deals: 0,
      tickets: 0,
    });
  });

  it('reports zero paid tickets when there are no paid deals', () => {
    expect(pipelineSummary([deal({ stage: 'lead' })]).paidTickets).toBe(0);
    expect(B2B_STAGES).toHaveLength(4);
  });
});
