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
import type {
  GeneratedHypotheses,
  ProblemHypothesis,
  SolutionHypothesis,
  SolutionRiskKind,
} from './types/generated-hypotheses';
import type { GeneratedDecisions, GeneratedDecisionOutcome } from './types/generated-decisions';
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

/** Full hypothesis statement: «{subject} {action} {solution}, если {condition}». */
export function hypothesisStatement(h: Hypothesis): string {
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
  return `${rank}. [ICE ${h.iceScore} · ${bucket}] ${KIND_LABEL[h.kind]}: ${hypothesisStatement(h)} — статус: ${STATUS_LABEL[h.status]}, дедлайн ${h.deadlineAt}`;
}

// ---------------------------------------------------------------------------
// AI-generated hypotheses (generatedHypotheses in ReportSnapshot)
// ---------------------------------------------------------------------------

/** Shared section type — mirrors ReportSection from report-sections.ts (no circular import). */
export interface AiReportSection {
  readonly heading: string;
  readonly lines: string[];
}

/** Russian labels for the five mandatory solution risk dimensions. */
export const RISK_KIND_LABEL: Record<SolutionRiskKind, string> = {
  value: 'Ценность',
  usability: 'Удобство',
  feasibility: 'Технический',
  business: 'Бизнес',
  legal: 'Юридический-репутационный',
};

/**
 * Prioritisation overview section for AI-generated solutions, sorted by ICE score descending.
 * One line per solution: «[ICE {score}] {id}: Если {action}, то {userBenefit}, что приведёт к {businessResult}».
 */
export function aiSolutionPrioritySection(
  solutions: readonly SolutionHypothesis[],
): AiReportSection {
  const sorted = [...solutions].sort((a, b) => b.ice.score - a.ice.score);
  return {
    heading: 'Приоритизация AI-гипотез (по ICE)',
    lines:
      sorted.length === 0
        ? ['AI-гипотезы ещё не сгенерированы.']
        : [
            'AI-решенческие гипотезы, отсортированы по убыванию ICE:',
            '',
            ...sorted.map(
              (s) =>
                `[ICE ${s.ice.score}] ${s.id}: Если ${s.action}, то ${s.userBenefit}, что приведёт к ${s.businessResult}`,
            ),
          ],
  };
}

/** Full per-problem section for an AI-generated problem hypothesis. */
export function aiProblemSection(p: ProblemHypothesis, ordinal: number): AiReportSection {
  return {
    heading: `${ordinal}. ${p.id}`,
    lines: [
      `${p.segment} испытывает ${p.trouble} при ${p.action}, потому что ${p.barrier}`,
      `Обоснование (данные): ${p.evidence}`,
    ],
  };
}

/** Full per-solution section for an AI-generated solution hypothesis. */
export function aiSolutionSection(s: SolutionHypothesis, ordinal: number): AiReportSection {
  const lines: string[] = [
    `Если ${s.action}, то ${s.userBenefit}, что приведёт к ${s.businessResult}`,
    `Критерий успеха: ${s.successCriteria}`,
    `Связана с проблемой: ${s.problemId}`,
    '',
    'Риски:',
    ...s.risks.map((r) => `  • ${RISK_KIND_LABEL[r.kind]}: ${r.note}`),
    '',
    'План проверки:',
    `  Что проверяем: ${s.validation.whatToVerify}`,
    `  Методы: ${s.validation.methods.join(', ')}`,
    `  Аудитория: ${s.validation.audience}`,
    `  Канал: ${s.validation.channel}`,
    `  Критерий успеха: ${s.validation.successCriteria}`,
    '',
    'ICE:',
    `  Impact ${s.ice.impact}/10 — ${s.ice.impactRationale}`,
    `  Confidence ${s.ice.confidence}/10 — ${s.ice.confidenceRationale}`,
    `  Ease ${s.ice.ease}/10 — ${s.ice.easeRationale}`,
    `  Score: ${s.ice.impact} × ${s.ice.confidence} × ${s.ice.ease} = ${s.ice.score}`,
    '',
    'Светофор:',
    `  🟢 ${s.trafficLight.green}`,
    `  🟡 ${s.trafficLight.yellow}`,
    `  🔴 ${s.trafficLight.red}`,
    `Дедлайн проверки: ${s.deadline}`,
  ];
  return { heading: `${ordinal}. ${s.id}`, lines };
}

/**
 * Build all AI-hypothesis sections from a GeneratedHypotheses value.
 * Returns an empty array when the value is absent or has no entries.
 * Insertion order: priority overview → problem sections → solution sections (sorted by ICE desc).
 */
export function aiHypothesisSections(gh: GeneratedHypotheses | undefined): AiReportSection[] {
  if (!gh || (gh.problems.length === 0 && gh.solutions.length === 0)) return [];

  const sortedSolutions = [...gh.solutions].sort((a, b) => b.ice.score - a.ice.score);

  return [
    aiSolutionPrioritySection(gh.solutions),
    {
      heading: 'Проблемные гипотезы (AI)',
      lines:
        gh.problems.length === 0
          ? ['Проблемные AI-гипотезы не сгенерированы.']
          : [
              `Сгенерировано ${gh.problems.length} проблемных гипотез. Полная карточка каждой — ниже.`,
              ...gh.problems.map((p, i) => `  ${i + 1}) ${p.id}: ${p.segment} — ${p.trouble}`),
            ],
    },
    ...gh.problems.map((p, i) => aiProblemSection(p, i + 1)),
    {
      heading: 'Решенческие гипотезы (AI)',
      lines:
        sortedSolutions.length === 0
          ? ['Решенческие AI-гипотезы не сгенерированы.']
          : [
              `Сгенерировано ${sortedSolutions.length} решенческих гипотез. Полная карточка каждой — ниже.`,
              ...sortedSolutions.map(
                (s, i) =>
                  `  ${i + 1}) ${s.id} [ICE ${s.ice.score}]: Если ${s.action}, то ${s.userBenefit}`,
              ),
            ],
    },
    ...sortedSolutions.map((s, i) => aiSolutionSection(s, i + 1)),
  ];
}

/** Russian traffic-light label for a proposed decision outcome. */
export const DECISION_OUTCOME_LABEL: Record<GeneratedDecisionOutcome, string> = {
  green: '🟢 продолжать',
  yellow: '🟡 доработать',
  red: '🔴 отказаться',
};

/**
 * AI-proposed Decision Log section (generatedDecisions). Empty array when none were generated, so
 * the report simply omits the block. Each decision spells out method, period, finding and outcome.
 */
export function aiDecisionSections(gd: GeneratedDecisions | undefined): AiReportSection[] {
  if (!gd || gd.decisions.length === 0) return [];
  return [
    {
      heading: 'Decision Log (предполагаемые решения, AI)',
      lines: [
        `AI предложил ${gd.decisions.length} решений на основе данных среза и гипотез.`,
        'Это черновики для обсуждения командой, а не зафиксированные решения.',
      ],
    },
    ...gd.decisions.map((d, i) => ({
      heading: `${i + 1}. ${d.id} → гипотеза ${d.hypothesisId}`,
      lines: [
        `Исход: ${DECISION_OUTCOME_LABEL[d.outcome]} — ${d.outcomeRationale}`,
        `Метод: ${d.method} · период: ${d.periodDays} дн. · объём: ${d.scope}`,
        `Вывод (уверенность: ${d.confidence}): ${d.findings}`,
        `Обоснование (данные): ${d.evidence}`,
        `Источник: ${d.source}`,
      ],
    })),
  ];
}
