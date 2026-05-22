import type { B2bDeal, ChannelStat, Decision, Goal, Hypothesis, NewHypothesis } from '@pca/shared';

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
  goals: (archived = false) => http<Goal[]>(`/metrics/goals${archived ? '?archived=true' : ''}`),
  hypotheses: () => http<Hypothesis[]>('/hypotheses'),
  createHypothesis: (h: NewHypothesis) =>
    http<Hypothesis>('/hypotheses', { method: 'POST', body: JSON.stringify(h) }),
  decisions: () => http<Decision[]>('/decisions'),
  b2b: () => http<B2bDeal[]>('/b2b'),
  sync: (body: { from: string; to: string; goalId?: number }) =>
    http<SyncSummary>('/sync', { method: 'POST', body: JSON.stringify(body) }),
};
