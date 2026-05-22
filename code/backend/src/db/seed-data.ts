import type { ChannelStat, GeoDeviceStat, Goal, NewB2bDeal, PageStat, UtmStat } from '@pca/shared';

/**
 * Deterministic demo dataset so `./run.sh` shows a populated dashboard without an OAuth token.
 * Pure (no DB, no clock) — the CLI seeder writes it via the repositories. Numbers are illustrative,
 * not real Metrika data; the «заявка ≠ оплата» split is kept realistic (few paid B2B vs many B2C).
 */
export interface SeedData {
  readonly goals: Goal[];
  readonly channels: ChannelStat[];
  readonly utm: UtmStat[];
  readonly geoDevice: GeoDeviceStat[];
  readonly pages: PageStat[];
  readonly exitPages: PageStat[];
  readonly b2b: NewB2bDeal[];
}

const DATES = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'] as const;
const CHANNELS = [
  { channel: 'podcast', visits: 420, reaches: 12 },
  { channel: 'direct', visits: 260, reaches: 18 },
  { channel: 'social', visits: 180, reaches: 4 },
  { channel: 'referral', visits: 90, reaches: 9 },
] as const;

/** Build the full demo dataset. Same output every call (deterministic). */
export function buildSeedData(): SeedData {
  const channels: ChannelStat[] = [];
  for (const [i, date] of DATES.entries()) {
    for (const c of CHANNELS) {
      // Gentle day-over-day ramp so the Trends line and WoW deltas look alive.
      const visits = c.visits + i * 15;
      const goalReaches = c.reaches + i;
      channels.push({
        date,
        channel: c.channel,
        utmSource: null,
        utmMedium: null,
        utmCampaign: null,
        visits,
        users: Math.round(visits * 0.9),
        bounceRate: 0.2 + i * 0.01,
        avgDuration: 60 + i * 2,
        goalReaches,
        conversionRate: goalReaches / visits,
      });
    }
  }

  const utm: UtmStat[] = [
    mkUtm('2025-01-02', 'vk', 'cpc', 'spring-launch', 240, 9),
    mkUtm('2025-01-03', 'telegram', 'social', 'channel-post', 130, 6),
    mkUtm('2025-01-04', 'email', 'newsletter', 'digest-01', 80, 7),
    mkUtm('2025-01-04', '(none)', '(none)', '(none)', 310, 11),
  ];

  const geoDevice: GeoDeviceStat[] = [
    mkGeo('2025-01-02', 'Россия', 'mobile', 520, 22),
    mkGeo('2025-01-02', 'Россия', 'desktop', 280, 16),
    mkGeo('2025-01-03', 'Казахстан', 'mobile', 70, 3),
    mkGeo('2025-01-03', 'Беларусь', 'desktop', 40, 2),
  ];

  const pages: PageStat[] = [
    mkPage('2025-01-02', '/', 380, 0.18, 14),
    mkPage('2025-01-02', '/tickets', 210, 0.12, 19),
    mkPage('2025-01-03', '/program', 140, 0.34, 3),
  ];

  const exitPages: PageStat[] = [
    mkPage('2025-01-02', '/checkout', 120, 0.55, 6),
    mkPage('2025-01-02', '/tickets', 95, 0.41, 5),
    mkPage('2025-01-03', '/', 60, 0.62, 1),
  ];

  const b2b: NewB2bDeal[] = [
    {
      company: 'BigCorp',
      tickets: 20,
      stage: 'paid',
      dateAdded: '2025-01-02',
      datePaid: '2025-01-04',
    },
    { company: 'MidMarket', tickets: 8, stage: 'invoiced', dateAdded: '2025-01-03' },
    { company: 'StartupZ', tickets: 4, stage: 'negotiation', dateAdded: '2025-01-03' },
    { company: 'LeadCo', tickets: 2, stage: 'lead', dateAdded: '2025-01-05' },
  ];

  const goals: Goal[] = [
    {
      id: 80,
      name: 'Заявка на билет',
      type: 'form',
      isB2b: false,
      isArchived: false,
      syncedAt: SEEDED_AT,
    },
    {
      id: 81,
      name: 'Оплата',
      type: 'action',
      isB2b: false,
      isArchived: false,
      syncedAt: SEEDED_AT,
    },
    {
      id: 12,
      name: 'Старая цель',
      type: 'action',
      isB2b: false,
      isArchived: true,
      syncedAt: SEEDED_AT,
    },
  ];

  return { goals, channels, utm, geoDevice, pages, exitPages, b2b };
}

const SEEDED_AT = '2025-01-05T00:00:00.000Z';

function mkUtm(
  date: string,
  utmSource: string,
  utmMedium: string,
  utmCampaign: string,
  visits: number,
  goalReaches: number,
): UtmStat {
  return {
    date,
    utmSource,
    utmMedium,
    utmCampaign,
    visits,
    users: Math.round(visits * 0.9),
    goalReaches,
    conversionRate: goalReaches / visits,
  };
}

function mkGeo(
  date: string,
  country: string,
  device: string,
  visits: number,
  goalReaches: number,
): GeoDeviceStat {
  return {
    date,
    country,
    device,
    visits,
    users: Math.round(visits * 0.9),
    goalReaches,
    conversionRate: goalReaches / visits,
  };
}

function mkPage(
  date: string,
  page: string,
  visits: number,
  bounceRate: number,
  goalReaches: number,
): PageStat {
  return {
    date,
    page,
    visits,
    users: Math.round(visits * 0.9),
    bounceRate,
    goalReaches,
    conversionRate: goalReaches / visits,
  };
}
