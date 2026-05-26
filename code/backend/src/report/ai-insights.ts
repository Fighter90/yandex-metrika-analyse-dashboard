import { z } from 'zod';
import type { ReportSnapshot } from '@pca/shared';

/** Anthropic Messages API endpoint + version. */
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_VERSION = '2023-06-01';

/** Minimal fetch shape (injectable so the call is unit-testable without a network). */
export interface AnthropicFetch {
  (
    url: string,
    init: { method: string; headers: Record<string, string>; body: string },
  ): Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
}

export interface AnthropicRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly system: string;
  readonly messages: { role: 'user'; content: string }[];
}

/**
 * Expanded factual summary of the snapshot — channels, UTM, geo, pages, B2B, funnel.
 * The only numbers the model is allowed to use.
 */
export function snapshotFacts(s: ReportSnapshot): string {
  const top = <T>(rows: T[], fmt: (r: T) => string): string =>
    rows.slice(0, 8).map(fmt).join('; ') || '—';

  // Aggregate channels
  const channelMap = new Map<string, { visits: number; reaches: number }>();
  for (const c of s.channels) {
    const cur = channelMap.get(c.channel) ?? { visits: 0, reaches: 0 };
    channelMap.set(c.channel, {
      visits: cur.visits + c.visits,
      reaches: cur.reaches + c.goalReaches,
    });
  }
  const topChannels = [...channelMap.entries()]
    .sort((a, b) => b[1].visits - a[1].visits)
    .slice(0, 12)
    .map(([ch, v]) => {
      const cr = v.visits > 0 ? ((v.reaches / v.visits) * 100).toFixed(1) : '0.0';
      return `${ch}: ${v.visits} виз., ${v.reaches} заяв. (CR ${cr}%)`;
    })
    .join('; ');

  const totalVisits = s.channels.reduce((a, c) => a + c.visits, 0);
  const overallCR =
    totalVisits > 0 ? ((s.kpi.b2cApplications / totalVisits) * 100).toFixed(1) : '0.0';

  // B2B data (may be in the snapshot payload)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b2bSummary = (s as any).b2bSummary;
  const b2bDeals = b2bSummary?.deals ?? [];
  const b2bTotal = b2bSummary?.totalTickets ?? s.kpi.b2bPaidTickets;
  const b2bPaid = s.kpi.b2bPaidTickets;

  // Funnel data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funnel = (s as any).funnel;
  const funnelVisits = funnel?.visits ?? totalVisits;
  const funnelCR =
    funnelVisits > 0 ? ((s.kpi.b2cApplications / funnelVisits) * 100).toFixed(1) : '0.0';

  const lines: string[] = [
    `Период: ${s.period.from} — ${s.period.to}.`,
    `KPI: цель ${s.kpi.target} платных билетов; заявок B2C ${s.kpi.b2cApplications}; ` +
      `оплачено B2B ${b2bPaid}; gap до цели ${s.kpi.gap}.`,
    `Общий CR (заявки/визиты): ${overallCR}% (${totalVisits} визитов суммарно).`,
    `Воронка: ${funnelVisits} визитов → ${s.kpi.b2cApplications} заявок (CR ${funnelCR}%) → ` +
      `${b2bTotal} B2B билетов → ${b2bPaid} оплачено B2B.`,
  ];

  if (topChannels) lines.push(`Топ каналов: ${topChannels}.`);

  const utmFmt = (u: {
    source: string;
    medium: string;
    campaign: string;
    visits: number;
    goalReaches: number;
  }) => `${u.source}/${u.medium}/${u.campaign} — ${u.visits} виз., ${u.goalReaches} заяв.`;
  const geoFmt = (g: { country: string; device: string; visits: number; goalReaches: number }) =>
    `${g.country}/${g.device} — ${g.visits} виз., ${g.goalReaches} заяв.`;
  const pageFmt = (p: { page: string; visits: number; bounceRate: number; goalReaches: number }) =>
    `${p.page} — ${p.visits} виз., ${(p.bounceRate * 100).toFixed(1)}% отказов, ${p.goalReaches} заяв.`;

  lines.push(`Топ UTM: ${top(s.breakdowns.utm, utmFmt)}.`);
  lines.push(`Топ гео+устройство: ${top(s.breakdowns.geoDevice, geoFmt)}.`);
  lines.push(`Топ страниц входа: ${top(s.breakdowns.entryPages, pageFmt)}.`);
  lines.push(`Топ страниц выхода: ${top(s.breakdowns.exitPages, pageFmt)}.`);

  if (b2bDeals.length > 0) {
    const dealsStr = b2bDeals
      .map(
        (d: { company: string; tickets: number; stage: string }) =>
          `${d.company} — ${d.tickets} билетов (${d.stage})`,
      )
      .join('; ');
    lines.push(`B2B сделки: ${dealsStr}. Всего B2B: ${b2bTotal} билетов.`);
  } else {
    lines.push('B2B сделок нет.');
  }

  lines.push(
    `Гипотезы: ${s.hypotheses.problems.length} проблемных, ` +
      `${s.hypotheses.solutions.length} решенческих. ` +
      `Решений в Decision Log: ${s.decisions.length}.`,
  );

  // AI-generated hypotheses if present
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genHyp = (s as any).generatedHypotheses;
  if (genHyp && genHyp.problems.length > 0) {
    const probStr = genHyp.problems
      .slice(0, 5)
      .map(
        (p: { id: string; segment: string; trouble: string }) =>
          `${p.id}: ${p.segment} — ${p.trouble}`,
      )
      .join('; ');
    lines.push(`AI проблемные гипотезы: ${probStr}.`);
  }
  if (genHyp && genHyp.solutions.length > 0) {
    const topSol = [...genHyp.solutions]
      .sort(
        (a: { ice: { score: number } }, b: { ice: { score: number } }) => b.ice.score - a.ice.score,
      )
      .slice(0, 3);
    const solStr = topSol
      .map((s: { id: string; ice: { score: number } }) => `${s.id} [ICE ${s.ice.score}]`)
      .join('; ');
    lines.push(`AI решения (топ-3 по ICE): ${solStr}.`);
  }

  return lines.join('\n');
}

/**
 * Chunked AI analysis: generates the report narrative by making multiple focused calls
 * to the LLM, then combines the results. This avoids truncation and produces a
 * detailed 30+ page report.
 */
interface AnalysisChunk {
  readonly section: string;
  readonly systemPrompt: string;
  readonly userPrompt: (facts: string) => string;
}

const ANALYSIS_CHUNKS: AnalysisChunk[] = [
  {
    section: 'Итог',
    systemPrompt:
      'Ты — старший продуктовый аналитик. Пиши по-русски, развёрнуто. Используй ТОЛЬКО приведённые числа. ' +
      'Принцип «заявка ≠ оплата» соблюдай строго. Напиши подробный executive summary (3–5 абзацев): ' +
      'где мы сейчас, какой gap до цели, основные выводы по данным.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nНапиши подробный итог для команды трека «Конверсии и лидген».`,
  },
  {
    section: 'Каналы и UTM',
    systemPrompt:
      'Ты — аналитик трафика. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Проанализируй каждый канал: объём, CR, качество трафика. Сравни каналы между собой. ' +
      'Выдели лучшие и худшие. Напиши 2–3 абзаца на каждый значимый канал.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nДетальный анализ каналов и UTM: какой трафик конвертирует, какой — пустые визиты.`,
  },
  {
    section: 'Аудитория',
    systemPrompt:
      'Ты — аналитик аудитории. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Проанализируй гео и устройства: какие регионы и устройства приносят больше заявок, ' +
      'где конверсия выше/ниже. Напиши 2–3 абзаца.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nАнализ аудитории: гео, устройства, различия в конверсии.`,
  },
  {
    section: 'Страницы',
    systemPrompt:
      'Ты — аналитик поведения. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Проанализируй страницы входа и выхода: где высокий bounce, где отвалы, ' +
      'какие страницы работают хорошо, какие — плохо. Напиши 2–3 абзаца.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nАнализ страниц входа и выхода: bounce rate, отвалы, точки роста.`,
  },
  {
    section: 'Воронка и B2B',
    systemPrompt:
      'Ты — аналитик воронки. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Проанализируй воронку: где потери, какие этапы работают, ' +
      'каков статус B2B-сделок, что можно улучшить. Напиши 2–3 абзаца.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nАнализ воронки конверсии и B2B-трека: потери, точки роста, статус сделок.`,
  },
  {
    section: 'Риски',
    systemPrompt:
      'Ты — аналитик рисков. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Выяви 5–7 ключевых рисков для достижения цели в 300 платных билетов. ' +
      'Каждый риск — с конкретными цифрами и обоснованием. Напиши по абзацу на каждый риск.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nВыяви ключевые риски для достижения цели в 300 платных билетов.`,
  },
  {
    section: 'Рекомендации',
    systemPrompt:
      'Ты — старший продуктовый аналитик. Пиши по-русски, конкретно. Используй ТОЛЬКО приведённые числа. ' +
      'Дай 5–7 конкретных рекомендаций с ожидаемым эффектом. Каждая рекомендация: ' +
      'что сделать, почему, какой результат ожидать (в цифрах), приоритет. ' +
      'Напиши по абзацу на каждую рекомендацию.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nКонкретные рекомендации для команды трека «Конверсии и лидген».`,
  },
  {
    section: 'Приоритизация гипотез',
    systemPrompt:
      'Ты — продуктовый менеджер. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Проанализируй существующие гипотезы (если есть) или предложи новые. ' +
      'Расставь приоритеты по ICE (Impact × Confidence × Ease). ' +
      'Для каждой гипотезы: формулировка, обоснование ICE, план проверки, дедлайн.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nПриоритизация гипотез по ICE с подробным обоснованием каждого балла.`,
  },
  {
    section: 'Гипотезы решений',
    systemPrompt:
      'Ты — продуктовый стратег. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Для каждой ключевой проблемы предложи конкретное решение. ' +
      'Формула: «Если [сделаем X], то [пользователи смогут Y], что приведёт к [результату Z]». ' +
      'Для каждого решения: риски, план проверки, критерии успеха, дедлайн.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nПодробные гипотезы решений с рисками, планами проверки и критериями успеха.`,
  },
  {
    section: 'Дорожная карта',
    systemPrompt:
      'Ты — руководитель проекта. Пиши по-русски, конкретно. Используй ТОЛЬКО приведённые числа. ' +
      'Составь дорожную карту на оставшийся период до старта ProductCamp. ' +
      'Разбей на недели: что делать, кто ответственный, какой результат. ' +
      'Фокус на быстрых победах (quick wins) и долгосрочных действиях.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nДорожная карта для команды трека «Конверсии и лидген» на оставшийся период.`,
  },
];

/** Generate one analysis chunk via Anthropic. */
async function generateChunk(
  doFetch: AnthropicFetch,
  apiKey: string,
  model: string,
  chunk: AnalysisChunk,
  facts: string,
): Promise<string> {
  const req: AnthropicRequest = {
    model,
    max_tokens: 4000,
    system: chunk.systemPrompt,
    messages: [{ role: 'user', content: chunk.userPrompt(facts) }],
  };
  const res = await doFetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(req),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Anthropic request failed (HTTP ${res.status}): ${raw}`);

  const ResponseSchema = z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  });
  const parsed = ResponseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('Anthropic response did not match the expected schema');

  return parsed.data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();
}

/**
 * Build the Anthropic request from the snapshot. Pure, deterministic given the snapshot.
 * (Legacy single-call version — kept for backwards compatibility.)
 */
export function buildInsightsRequest(snapshot: ReportSnapshot, model: string): AnthropicRequest {
  const system =
    'Ты — старший продуктовый аналитик ProductCamp. ' +
    'Пиши по-русски, развёрнуто и детально. ' +
    'Используй ТОЛЬКО приведённые числа — НИЧЕГО не выдумывай и не добавляй данные, которых нет. ' +
    'Принцип «заявка ≠ оплата» соблюдай строго: заявки B2C — это достижения цели в Метрике, ' +
    'а не оплаты. Оплаты B2B — из ручного пайплайна. Gap считается по оплатам, не по заявкам.\n\n' +
    'Формат ответа: разделы «Итог», «Каналы и UTM», «Аудитория», «Страницы», ' +
    '«Риски», «Рекомендации» (3–5 пунктов каждый). ' +
    'Каждый раздел — с конкретными цифрами и выводами. ' +
    'В рекомендациях — конкретные действия с ожидаемым эффектом. ' +
    'Без преамбулы. Выводи полный текст — не обрезай.';

  const user =
    `Снапшот ${snapshot.id}. Данные:\n${snapshotFacts(snapshot)}\n\n` +
    'Сделай подробный разбор для команды трека «Конверсии и лидген». Проанализируй:\n' +
    '1) Какой трафик приносит заявки, а какой — пустые визиты.\n' +
    '2) Где точки роста к цели в 300 платных билетов.\n' +
    '3) Какие гипотезы проверить в первую очередь.\n' +
    '4) Что делать с B2B-треком (если есть данные).\n' +
    '5) Слабые места сайта (высокий bounce, низкий CR).\n' +
    'Опирайся только на числа выше. Выводи полный текст — не обрезай.';

  return { model, max_tokens: 4000, system, messages: [{ role: 'user', content: user }] };
}

const ResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

/** Extract the plain-text narrative from an Anthropic Messages response body. */
export function parseInsights(raw: string): string {
  const parsed = ResponseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('Anthropic response did not match the expected schema');
  return parsed.data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();
}

/**
 * Generate the full detailed report narrative using chunked AI analysis.
 * Makes multiple focused calls to the LLM, then combines results.
 */
export async function generateInsightsChunked(
  doFetch: AnthropicFetch,
  input: { apiKey: string; model: string; snapshot: ReportSnapshot },
): Promise<string> {
  const facts = snapshotFacts(input.snapshot);
  const sections: string[] = [];

  for (const chunk of ANALYSIS_CHUNKS) {
    try {
      const result = await generateChunk(doFetch, input.apiKey, input.model, chunk, facts);
      sections.push(`## ${chunk.section}\n\n${result}`);
    } catch (err) {
      // If one chunk fails, skip it and continue with the rest
      sections.push(
        `## ${chunk.section}\n\n[Ошибка генерации: ${(err as Error).message} — раздел пропущен]`,
      );
    }
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Call Anthropic to generate the narrative. Throws on a non-2xx response. Never logs the key.
 * Uses the chunked approach for detailed 30+ page reports.
 */
export async function generateInsights(
  doFetch: AnthropicFetch,
  input: { apiKey: string; model: string; snapshot: ReportSnapshot },
): Promise<string> {
  return generateInsightsChunked(doFetch, input);
}
