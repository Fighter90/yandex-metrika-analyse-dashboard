import type { B2bDeal, B2bStage } from '@pca/shared';

export const B2B_STAGES: readonly B2bStage[] = ['lead', 'negotiation', 'invoiced', 'paid'];

export interface StageSummary {
  readonly stage: B2bStage;
  readonly deals: number;
  readonly tickets: number;
}

export interface PipelineSummary {
  readonly byStage: StageSummary[];
  readonly totalTickets: number;
  readonly paidTickets: number;
}

/** Counts and ticket sums per pipeline stage; paidTickets feeds the B2B part of the KPI. */
export function pipelineSummary(deals: B2bDeal[]): PipelineSummary {
  const byStage = B2B_STAGES.map((stage) => {
    const inStage = deals.filter((d) => d.stage === stage);
    return {
      stage,
      deals: inStage.length,
      tickets: inStage.reduce((acc, d) => acc + d.tickets, 0),
    };
  });
  const totalTickets = deals.reduce((acc, d) => acc + d.tickets, 0);
  const paidTickets = deals
    .filter((d) => d.stage === 'paid')
    .reduce((acc, d) => acc + d.tickets, 0);
  return { byStage, totalTickets, paidTickets };
}
