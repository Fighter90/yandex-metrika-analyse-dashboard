/**
 * One stable colour per traffic channel + per metric, so the same channel/metric reads the same
 * across every chart (Overview pie, Traffic bars, …). Channel names come from Metrika in mixed
 * RU/EN ("Direct traffic", "Переходы из поисковых систем"), so we resolve by keyword substring.
 */
const CHANNEL_PALETTE = {
  direct: '#3B82F6',
  search: '#10B981',
  internal: '#8B5CF6',
  mailing: '#F59E0B',
  messenger: '#06B6D4',
  social: '#EC4899',
  ad: '#EF4444',
  link: '#84CC16',
  recommendation: '#A855F7',
} as const;

const CHANNEL_FALLBACK = '#64748B';

/** Keyword → palette key. Order matters; first match wins. */
const CHANNEL_RULES: ReadonlyArray<readonly [readonly string[], keyof typeof CHANNEL_PALETTE]> = [
  [['direct', 'прям'], 'direct'],
  [['search', 'поиск'], 'search'],
  [['internal', 'внутр'], 'internal'],
  [['mail', 'рассыл'], 'mailing'],
  [['messenger', 'мессендж'], 'messenger'],
  [['social', 'соц'], 'social'],
  [['recommend', 'реком'], 'recommendation'],
  [['link', 'ссыл'], 'link'],
  [['ad traffic', 'реклам'], 'ad'],
];

export function channelColor(channel: string): string {
  const n = channel.toLowerCase();
  for (const [keywords, key] of CHANNEL_RULES) {
    if (keywords.some((k) => n.includes(k))) return CHANNEL_PALETTE[key];
  }
  return CHANNEL_FALLBACK;
}

export const METRIC_COLORS = {
  visits: '#64748B',
  applications: '#0EA5E9',
  payments: '#16A34A',
  b2bPipeline: '#A16207',
  gap: '#DC2626',
} as const;
