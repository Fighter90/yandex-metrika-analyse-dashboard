import type { ChannelStat, B2bDeal } from '@pca/shared';
import { intTooltip } from './echart-format';

export interface FunnelStage {
  readonly label: string;
  readonly value: number;
  /** Conversion from the previous stage, 0–1. The first stage is always 1 (100%). */
  readonly fromPrev: number;
  readonly hint?: string;
}

/**
 * The «заявка ≠ оплата» conversion funnel: site visits → B2C goal reaches (заявки) →
 * B2B tickets in pipeline → B2B paid tickets (the only stage that counts toward the KPI).
 * Pure and deterministic — computed from already-fetched channel + B2B data.
 */
export function buildFunnel(stats: ChannelStat[], deals: B2bDeal[]): FunnelStage[] {
  const visits = stats.reduce((acc, s) => acc + s.visits, 0);
  const reaches = stats.reduce((acc, s) => acc + s.goalReaches, 0);
  const b2bTickets = deals.reduce((acc, d) => acc + d.tickets, 0);
  const b2bPaid = deals.reduce((acc, d) => acc + (d.stage === 'paid' ? d.tickets : 0), 0);

  const raw = [
    { label: 'Визиты', value: visits },
    { label: 'Заявки B2C (goal reaches)', value: reaches, hint: 'заявка ≠ оплата' },
    { label: 'Билеты B2B (в работе)', value: b2bTickets },
    { label: 'Оплачено B2B', value: b2bPaid, hint: 'засчитывается в цель' },
  ];

  return raw.map((stage, i) => {
    const prev = i === 0 ? undefined : raw[i - 1];
    const prevValue = prev?.value ?? 0;
    const fromPrev = prev === undefined ? 1 : prevValue === 0 ? 0 : stage.value / prevValue;
    return { ...stage, fromPrev };
  });
}

/** ECharts funnel option from the computed stages. */
export function funnelOption(stages: FunnelStage[]): object {
  return {
    tooltip: { trigger: 'item', ...intTooltip },
    series: [
      {
        type: 'funnel',
        sort: 'none',
        data: stages.map((s) => ({ name: s.label, value: s.value })),
      },
    ],
  };
}
