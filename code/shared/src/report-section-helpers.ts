/**
 * Pure formatting helpers and label maps used by {@link reportSections}.
 *
 * Extracted here to keep `report-sections.ts` under the 400-line file-size contract.
 * These are module-private utilities — they are NOT re-exported from `@pca/shared/index`.
 */
import type {
  AssumptionCategory,
  Hypothesis,
  HypothesisStatus,
  ValidationMethodType,
} from './types/hypotheses';
import type {
  GeoDeviceBreakdownRow,
  PageBreakdownRow,
  ReportSnapshot,
  UtmBreakdownRow,
} from './types/report';
import { iceBucket, type IceBucket } from './validation';

export const CATEGORY_LABEL: Record<AssumptionCategory, string> = {
  behavior: 'Поведение',
  market: 'Рынок',
  tech: 'Технологии',
};

export const METHOD_LABEL: Record<ValidationMethodType, string> = {
  synthetic: 'Синтетический CustDev',
  live: 'Живой тест',
  quantitative: 'Количественный анализ',
  market: 'Рыночное исследование',
};

export const STATUS_LABEL: Record<HypothesisStatus, string> = {
  draft: 'черновик',
  in_progress: 'в работе',
  green: '🟢 подтверждена',
  yellow: '🟡 частично подтверждена',
  red: '🔴 опровергнута',
  expired: '⏳ просрочена',
};

export const BUCKET_LABEL: Record<IceBucket, string> = {
  low: 'низкий',
  medium: 'средний',
  high: 'высокий',
  top: 'топ-приоритет',
};

export const KIND_LABEL = { problem: 'проблема', solution: 'решение' } as const;

/** Full Voronkova statement: «{subject} {action} {solution}, если {condition}». */
export function voronkovaStatement(h: Hypothesis): string {
  return `«${h.subject} ${h.action} ${h.solution}, если ${h.condition}»`;
}

export function utmLine(u: UtmBreakdownRow): string {
  const cr = u.visits > 0 ? ((u.goalReaches / u.visits) * 100).toFixed(1) : '0.0';
  return `${u.source} / ${u.medium} / ${u.campaign}: визитов ${u.visits}, заявок ${u.goalReaches} (CR ${cr}%)`;
}

export function geoLine(g: GeoDeviceBreakdownRow): string {
  const cr = g.visits > 0 ? ((g.goalReaches / g.visits) * 100).toFixed(1) : '0.0';
  return `${g.country} · ${g.device}: визитов ${g.visits}, заявок ${g.goalReaches} (CR ${cr}%)`;
}

export function pageLine(p: PageBreakdownRow): string {
  return `${p.page}: визитов ${p.visits}, отказы ${(p.bounceRate * 100).toFixed(1)}%, заявок ${p.goalReaches}`;
}

export function channelLine(c: ReportSnapshot['channels'][number]): string {
  const cr = c.visits > 0 ? ((c.goalReaches / c.visits) * 100).toFixed(1) : '0.0';
  return `${c.date} · ${c.channel}: визитов ${c.visits}, заявок ${c.goalReaches} (CR ${cr}%), отказы ${(c.bounceRate * 100).toFixed(1)}%`;
}

export function pct(numerator: number, denominator: number): string {
  return denominator > 0 ? `${((numerator / denominator) * 100).toFixed(1)}%` : '0.0%';
}

export interface ChannelTotal {
  channel: string;
  visits: number;
  goalReaches: number;
}

/** Aggregate the per-date channel rows into per-channel totals, busiest first. */
export function channelTotals(channels: ReportSnapshot['channels']): ChannelTotal[] {
  const map = new Map<string, ChannelTotal>();
  for (const c of channels) {
    const cur = map.get(c.channel) ?? { channel: c.channel, visits: 0, goalReaches: 0 };
    cur.visits += c.visits;
    cur.goalReaches += c.goalReaches;
    map.set(c.channel, cur);
  }
  return [...map.values()].sort(
    (a, b) => b.visits - a.visits || a.channel.localeCompare(b.channel),
  );
}

/** One-line ICE summary used in the prioritization table. */
export function priorityLine(h: Hypothesis, rank: number): string {
  const bucket = BUCKET_LABEL[iceBucket(h.iceScore)];
  return `${rank}. [ICE ${h.iceScore} · ${bucket}] ${KIND_LABEL[h.kind]}: ${voronkovaStatement(h)} — статус: ${STATUS_LABEL[h.status]}, дедлайн ${h.deadlineAt}`;
}
