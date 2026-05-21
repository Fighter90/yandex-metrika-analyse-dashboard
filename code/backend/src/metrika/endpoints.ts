export const METRIKA_BASE_URL = 'https://api-metrika.yandex.net';

export const ENDPOINTS = {
  /** Management API — seed the goals table. */
  goals: (counterId: number): string => `/management/v1/counter/${counterId}/goals`,
  /** Reporting API — aggregated reports. */
  statData: '/stat/v1/data',
  /** Reporting API — time series. */
  statByTime: '/stat/v1/data/bytime',
  /** Reporting API — drill-down. */
  statDrilldown: '/stat/v1/data/drilldown',
} as const;
