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

/**
 * UTM-source/medium/campaign breakdown, stored in its own table (`utm_stats`) — a different
 * aggregation than channel_stats, so summing the two would double-count. Missing UTM values are
 * normalised to the literal `(none)` so the (date, source, medium, campaign) key is well-defined.
 */
export interface UtmStat {
  readonly date: string;
  readonly utmSource: string;
  readonly utmMedium: string;
  readonly utmCampaign: string;
  readonly visits: number;
  readonly users: number;
  readonly goalReaches: number;
  readonly conversionRate: number;
}

/** Sentinel for a missing breakdown-dimension value (UTM, geo, device, …). */
export const DIMENSION_NONE = '(none)';

/** @deprecated use {@link DIMENSION_NONE} — kept as an alias for existing UTM call sites. */
export const UTM_NONE = DIMENSION_NONE;

/**
 * Geo (country) + device-category breakdown, in its own table (`geo_device_stats`) — same rationale
 * as {@link UtmStat}: a distinct aggregation kept apart so visits aren't double-counted. Missing
 * dimensions are normalised to {@link DIMENSION_NONE}.
 */
export interface GeoDeviceStat {
  readonly date: string;
  readonly country: string;
  readonly device: string;
  readonly visits: number;
  readonly users: number;
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
