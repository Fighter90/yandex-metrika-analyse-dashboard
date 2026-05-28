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
 *
 * Reduced from 10 chunks to 5 for faster completion (~30-60 seconds total).
 */
interface AnalysisChunk {
  readonly section: string;
  readonly systemPrompt: string;
  readonly userPrompt: (facts: string) => string;
}

/**
 * Output-format rules appended to every chunk's system prompt so the narrative renders cleanly into
 * the ГОСТ DOCX/PDF: no Markdown headings, no self-numbering (the report adds section numbers), no
 * leading emoji on heading-like lines, no HTML. Defends against the markdown-leak defect (v2.9.0).
 */
export const AI_FORMAT_RULES =
  'ФОРМАТ ВЫВОДА (строго): пиши обычным текстом, абзацами. НЕ используй Markdown-заголовки (#, ##, ###, ####). ' +
  'НЕ нумеруй собственные подзаголовки («1.», «2.» как заголовки) — сквозную нумерацию разделов добавляет сам отчёт. ' +
  'НЕ начинай строки с эмодзи. Для перечислений используй строки, начинающиеся с «— ». ' +
  'Жирный — **двойными звёздочками**. Никаких HTML-тегов (<p>, <br> и т.п.).';

const ANALYSIS_CHUNKS: AnalysisChunk[] = [
  {
    section: 'Итог',
    systemPrompt:
      'Ты — старший продуктовый аналитик. Пиши по-русски, развёрнуто. Используй ТОЛЬКО приведённые числа. ' +
      'Принцип «заявка ≠ оплата» соблюдай строго. Напиши подробный executive summary (3–5 абзацев): ' +
      'где мы сейчас, какой gap до цели, основные выводы по данным. Включи анализ каналов, UTM, аудитории, страниц, воронки и B2B.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nНапиши подробный итог для команды трека «Конверсии и лидген».`,
  },
  {
    section: 'Каналы, UTM и Аудитория',
    systemPrompt:
      'Ты — аналитик трафика и аудитории. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Проанализируй каждый канал: объём, CR, качество трафика. Проанализируй UTM-кампании, ' +
      'гео и устройства. Выдели лучшие и худшие. Напиши 3–5 абзацев на каждый значимый аспект.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nДетальный анализ каналов, UTM, гео и устройств: какой трафик конвертирует, какой — пустые визиты.`,
  },
  {
    section: 'Страницы и Воронка',
    systemPrompt:
      'Ты — аналитик поведения и воронки. Пиши по-русски, детально. Используй ТОЛЬКО приведённые числа. ' +
      'Проанализируй страницы входа и выхода: где высокий bounce, где отвалы. ' +
      'Проанализируй воронку конверсии и B2B-трек. Напиши 3–5 абзацев.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nАнализ страниц, воронки конверсии и B2B-трека: bounce rate, отвалы, точки роста, статус сделок.`,
  },
  {
    section: 'Риски и Рекомендации',
    systemPrompt:
      'Ты — старший продуктовый аналитик. Пиши по-русски, конкретно. Используй ТОЛЬКО приведённые числа. ' +
      'Выяви 5–7 ключевых рисков и дай 5–7 конкретных рекомендаций с ожидаемым эффектом. ' +
      'Каждая рекомендация: что сделать, почему, какой результат ожидать (в цифрах), приоритет.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nРиски и рекомендации для команды трека «Конверсии и лидген».`,
  },
  {
    section: 'Гипотезы и Дорожная карта',
    systemPrompt:
      'Ты — продуктовый стратег и руководитель проекта. Пиши по-русски, детально. ' +
      'Используй ТОЛЬКО приведённые числа. ' +
      'Расставь приоритеты гипотез по ICE. Составь дорожную карту на оставшийся период. ' +
      'Для каждой гипотезы: формулировка, ICE, план проверки. Для дорожной карты: недели, ответственные, результат.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nПриоритизация гипотез по ICE и дорожная карта для команды трека «Конверсии и лидген».`,
  },
  {
    section: 'Итоговый вывод',
    systemPrompt:
      'Ты — старший продуктовый аналитик и руководитель трека. Пиши по-русски, развёрнуто. ' +
      'Используй ТОЛЬКО приведённые числа; принцип «заявка ≠ оплата» соблюдай строго. ' +
      'Это ФИНАЛЬНЫЙ раздел отчёта — подробный итоговый вывод ПОСЛЕ анализа, гипотез, решений и ' +
      'приоритизации. Синтезируй всё вместе (5–7 абзацев): где трек находится относительно цели ' +
      '300 оплат и какой gap; что в данных главное (каналы/UTM/воронка/B2B); какие 3 гипотезы бьём ' +
      'первыми и почему (по ICE); какие решения предлагаются и какой ожидаемый эффект в цифрах; ' +
      'чёткий вердикт 🟢/🟡/🔴 по достижимости цели и приоритетные следующие шаги на оставшийся срок. ' +
      'Не повторяй разделы дословно — дай связный управленческий вывод.',
    userPrompt: (facts) =>
      `Данные:\n${facts}\n\nПодробный итоговый вывод по треку «Конверсии и лидген»: синтез анализа, ` +
      `гипотез, решений и приоритизации + вердикт по цели и следующие шаги.`,
  },
];

/** Generate one analysis chunk via Anthropic with timeout. */
async function generateChunk(
  doFetch: AnthropicFetch,
  apiKey: string,
  model: string,
  chunk: AnalysisChunk,
  facts: string,
): Promise<string> {
  const req: AnthropicRequest = {
    model,
    max_tokens: 6000,
    system: `${chunk.systemPrompt}\n\n${AI_FORMAT_RULES}`,
    messages: [{ role: 'user', content: chunk.userPrompt(facts) }],
  };

  // Timeout: 120 seconds per chunk (needed for max_tokens: 6000)
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Chunk "${chunk.section}" timed out after 120s`)), 120_000),
  );

  const fetchPromise = doFetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(req),
  });

  const res = await Promise.race([fetchPromise, timeout]);
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

  return { model, max_tokens: 6000, system, messages: [{ role: 'user', content: user }] };
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
 * Makes 5 focused calls to the LLM (reduced from 10 for speed), then combines results.
 * Each chunk has a 45-second timeout. Failed chunks are skipped.
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
      // If one chunk fails or times out, skip it and continue with the rest
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
