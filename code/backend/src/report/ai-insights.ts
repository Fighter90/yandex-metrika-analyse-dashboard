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

/** Compact, factual summary of the snapshot — the only numbers the model is allowed to use. */
export function snapshotFacts(s: ReportSnapshot): string {
  const top = <T>(rows: T[], fmt: (r: T) => string): string =>
    rows.slice(0, 5).map(fmt).join('; ') || '—';
  return [
    `Период: ${s.period.from} — ${s.period.to}.`,
    `KPI: цель ${s.kpi.target} платных билетов; заявок B2C (goal reaches) ${s.kpi.b2cApplications}; ` +
      `оплачено B2B ${s.kpi.b2bPaidTickets}; gap до цели ${s.kpi.gap}.`,
    `Топ UTM: ${top(s.breakdowns.utm, (u) => `${u.source}/${u.medium}/${u.campaign} — ${u.visits} виз., ${u.goalReaches} заяв.`)}.`,
    `Топ гео+устройство: ${top(s.breakdowns.geoDevice, (g) => `${g.country}/${g.device} — ${g.visits} виз., ${g.goalReaches} заяв.`)}.`,
    `Топ страниц входа: ${top(s.breakdowns.entryPages, (p) => `${p.page} — ${p.visits} виз., ${p.goalReaches} заяв.`)}.`,
    `Проблем-гипотез: ${s.hypotheses.problems.length}; solution-гипотез: ${s.hypotheses.solutions.length}; решений: ${s.decisions.length}.`,
  ].join('\n');
}

/** Build the Anthropic request from the snapshot. Pure, deterministic given the snapshot. */
export function buildInsightsRequest(snapshot: ReportSnapshot, model: string): AnthropicRequest {
  const system =
    'Ты продуктовый аналитик ProductCamp. Пиши по-русски, кратко и по делу. Используй ТОЛЬКО ' +
    'приведённые числа — НИЧЕГО не выдумывай и не добавляй данные, которых нет. Принцип «заявка ≠ ' +
    'оплата» соблюдай строго. Формат ответа: разделы «Итог», «Каналы и UTM», «Аудитория», «Страницы», ' +
    '«Риски», «Рекомендации» (3–5 маркеров каждый). Без преамбулы.';
  const user =
    `Снапшот ${snapshot.id}. Данные:\n${snapshotFacts(snapshot)}\n\n` +
    'Сделай подробный разбор для команды трека «Конверсии и лидген»: что говорят графики дашборда, ' +
    'где точки роста к цели, какие гипотезы проверить. Опирайся только на числа выше.';
  return { model, max_tokens: 1500, system, messages: [{ role: 'user', content: user }] };
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

/** Call Anthropic to generate the narrative. Throws on a non-2xx response. Never logs the key. */
export async function generateInsights(
  doFetch: AnthropicFetch,
  input: { apiKey: string; model: string; snapshot: ReportSnapshot },
): Promise<string> {
  const res = await doFetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': input.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(buildInsightsRequest(input.snapshot, input.model)),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Anthropic request failed (HTTP ${res.status}): ${raw}`);
  return parseInsights(raw);
}
