/** Metrika-derived metric types, shared across backend and frontend. */

export interface Goal {
  readonly id: number;
  readonly name: string;
  readonly type: string;
  readonly isB2b: boolean;
  readonly isArchived: boolean;
  readonly syncedAt: string;
}

export interface RawResponse {
  readonly id: number;
  readonly endpoint: string;
  readonly queryHash: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly payload: unknown;
  readonly fetchedAt: string;
}

export interface NewRawResponse {
  readonly endpoint: string;
  readonly queryHash: string;
  readonly dateFrom: string;
  readonly dateTo: string;
  readonly payload: unknown;
  readonly fetchedAt: string;
}

export interface ChannelStat {
  readonly date: string;
  readonly channel: string;
  readonly utmSource: string | null;
  readonly utmMedium: string | null;
  readonly utmCampaign: string | null;
  readonly visits: number;
  readonly users: number;
  readonly bounceRate: number;
  readonly avgDuration: number;
  readonly goalReaches: number;
  readonly conversionRate: number;
}

export type B2bStage = 'lead' | 'negotiation' | 'invoiced' | 'paid';

export interface NewB2bDeal {
  readonly company: string;
  readonly tickets: number;
  readonly stage: B2bStage;
  readonly amountRub?: number;
  readonly contactEmail?: string;
  readonly notes?: string;
  readonly dateAdded: string;
  readonly datePaid?: string;
}

export interface B2bDeal extends NewB2bDeal {
  readonly id: number;
}
