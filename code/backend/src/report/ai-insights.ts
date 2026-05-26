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
    channelMap.set(c.channel, { visits: cur.visits + c.visits, reaches: cur.reaches + c.goalReaches });
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
  const overallCR = totalVisits > 0 ? ((s.kpi.b2cApplications / totalVisits) * 100).toFixed(1) : '0.0';

  // B2B data (may be in the snapshot payload)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b2bSummary = (s as any).b2bSummary as { deals?: Array<{ company: string; tickets: number; stage: string }>; totalTickets?: number } | undefined;
  const b2bDeals = b2bSummary?.deals ?? [];
  const b2bTotal = b2bSummary?.totalTickets ?? s.kpi.b2bPaidTickets;
  const b2bPaid = s.kpi.b2bPaidTickets;

  // Funnel data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funnel = (s as any).funnel as { visits?: number; b2cApplications?: number; b2bPipelineTickets?: number; b2bPaidTickets?: number } | undefined;
  const funnelVisits = funnel?.visits ?? totalVisits;
  const funnelCR = funnelVisits > 0 ? ((s.kpi.b2cApplications / funnelVisits) * 100).toFixed(1) : '0.0';

  const lines: string[] = [
    `Период: ${s.period.from} — ${s.period.to}.`,
    `KPI: цель ${s.kpi.target} платных билетов; заявок B2C (goal reaches) ${s.kpi.b2cApplications}; оплачено B2B ${b2bPaid}; gap до цели ${s.kpi.gap}.`,
    `Общий CR (заявки/визиты): ${overallCR}% (${totalVisits} визитов суммарно).`,
    `Воронка: ${funnelVisits} визитов → ${s.kpi.b2cApplications} заявок (CR ${funnelCR}%) → ${b2bTotal} B2B билетов → ${b2bPaid} оплачено B2B.`,
  ];

  if (topChannels) lines.push(`Топ каналов: ${topChannels}.`);

  const utmStr = top(s.breakdowns.utm, (u) => `${u.source}/${u.medium}/${u.campaign} — ${u.visits} виз., ${u.goalReaches} заяв.`);
  const geoStr = top(s.breakdowns.geoDevice, (g) => `${g.country}/${g.device} — ${g.visits} виз., ${g.goalReaches} заяв.`);
  const entryStr = top(s.breakdowns.entryPages, (p) => `${p.page} — ${p.visits} виз., ${(p.bounceRate * 100).toFixed(1)}% отказов, ${p.goalReaches} заяв.`);
  const exitStr = top(s.breakdowns.exitPages, (p) => `${p.page} — ${p.visits} виз., ${(p.bounceRate * 100).toFixed(1)}% отказов, ${p.goalReaches} заяв.`);

  lines.push(`Топ UTM: ${utmStr}.`);
  lines.push(`Топ гео+устройство: ${geoStr}.`);
  lines.push(`Топ страниц входа: ${entryStr}.`);
  lines.push(`Топ страниц выхода: ${exitStr}.`);

  if (b2bDeals.length > 0) {
    lines.push(
      `B2B сделки: ${b2bDeals.map((d) => `${d.company} — ${d.tickets} билетов (${d.stage})`).join('; ')}. Всего B2B: ${b2bTotal} билетов.`,
    );
  } else {
    lines.push('B2B сделок нет.');
  }

  lines.push(
    `Гипотезы: ${s.hypotheses.problems.length} проблемных, ${s.hypotheses.solutions.length} решенческих. Решений в Decision Log: ${s.decisions.length}.`,
  );

  // AI-generated hypotheses if present
  const snap = s as Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genHyp = snap.generatedHypotheses as any;
  if (genHyp && genHyp.problems.length > 0) {
    lines.push(`AI проблемные гипотезы: ${genHyp.problems.slice(0, 5).map((p) => `${p.id}: ${p.segment} — ${p.trouble}`).join('; ')}.`);
  }
  if (genHyp && genHyp.solutions.length > 0) {
    const topSol = [...genHyp.solutions].sort((a, b) => b.ice.score - a.ice.score).slice(0, 3);
    lines.push(`AI решения (топ-3 по ICE): ${topSol.map((s) => `${s.id} [ICE ${s.ice.score}]`).join('; ')}.`);
  }

  return lines.join('\n');
}

/** Build the Anthropic request from the snapshot. Pure, deterministic given the snapshot. */
export function buildInsightsRequest(snapshot: ReportSnapshot, model: string): AnthropicRequest {
  const system =
    'Ты — старший продуктовый аналитик ProductCamp. Пиши по-русски, развёрнуто и детально. ' +
    'Используй ТОЛЬКО приведённые числа — НИЧЕГО не выдумывай и не добавляй данные, которых нет. ' +
    'Принцип «заявка ≠ оплата» соблюдай строго: заявки B2C — это достижения цели в Метрике, ' +
    'а не оплаты. Оплаты B2B — из ручного пайплайна. Gap считается по оплатам, не по заявкам.\n\n' +
    'Формат ответа: разделы «Итог», «Каналы и UTM», «Аудитория», «Страницы», ' +
    '«Риски», «Рекомендации» (3–5 пунктов каждый). Каждый раздел — с конкретными цифрами и выводами. ' +
    'В рекомендациях — конкретные действия с ожидаемым эффектом. Без преамбулы. Выводи полный текст — не обрезай.';

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
