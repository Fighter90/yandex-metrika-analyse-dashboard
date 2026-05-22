import type {
  B2bDeal,
  B2bStage,
  ChannelStat,
  Decision,
  Goal,
  Hypothesis,
  NewB2bDeal,
  NewDecision,
  NewHypothesis,
  ReportSnapshot,
  UtmStat,
  GeoDeviceStat,
  PageStat,
} from '@pca/shared';

const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HealthInfo {
  status: string;
  counterId: number;
  metrikaTokenPresent: boolean;
}

export interface SyncSummary {
  goals: number;
  days: number;
  channelRows: number;
  utmRows: number;
  geoDeviceRows: number;
  pageRows: number;
  exitPageRows: number;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  health: () => http<HealthInfo>('/health'),
  channels: (range?: { from: string; to: string }) =>
    http<ChannelStat[]>(`/metrics/channels${range ? `?from=${range.from}&to=${range.to}` : ''}`),
  utm: (range?: { from: string; to: string }) =>
    http<UtmStat[]>(`/metrics/utm${range ? `?from=${range.from}&to=${range.to}` : ''}`),
  geoDevice: (range?: { from: string; to: string }) =>
    http<GeoDeviceStat[]>(
      `/metrics/geo-device${range ? `?from=${range.from}&to=${range.to}` : ''}`,
    ),
  pages: (range?: { from: string; to: string }) =>
    http<PageStat[]>(`/metrics/pages${range ? `?from=${range.from}&to=${range.to}` : ''}`),
  exitPages: (range?: { from: string; to: string }) =>
    http<PageStat[]>(`/metrics/exit-pages${range ? `?from=${range.from}&to=${range.to}` : ''}`),
  goals: (archived = false) => http<Goal[]>(`/metrics/goals${archived ? '?archived=true' : ''}`),
  hypotheses: () => http<Hypothesis[]>('/hypotheses'),
  createHypothesis: (h: NewHypothesis) =>
    http<Hypothesis>('/hypotheses', { method: 'POST', body: JSON.stringify(h) }),
  decisions: () => http<Decision[]>('/decisions'),
  createDecision: (d: NewDecision) =>
    http<Decision>('/decisions', { method: 'POST', body: JSON.stringify(d) }),
  b2b: () => http<B2bDeal[]>('/b2b'),
  createB2b: (deal: NewB2bDeal) =>
    http<B2bDeal>('/b2b', { method: 'POST', body: JSON.stringify(deal) }),
  updateB2bStage: (input: { id: number; stage: B2bStage; datePaid?: string }) =>
    http<B2bDeal>(`/b2b/${input.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stage: input.stage, datePaid: input.datePaid }),
    }),
  removeB2b: (id: number) => http<void>(`/b2b/${id}`, { method: 'DELETE' }),
  buildSnapshot: (body: { from: string; to: string }) =>
    http<ReportSnapshot>('/report/snapshot', { method: 'POST', body: JSON.stringify(body) }),
  generateReport: (body: { snapshotId: string; format: 'docx' | 'pdf' }) =>
    http<{ filePath: string }>('/report/generate', { method: 'POST', body: JSON.stringify(body) }),
  sync: (body: { from: string; to: string; goalId?: number }) =>
    http<SyncSummary>('/sync', { method: 'POST', body: JSON.stringify(body) }),
};
