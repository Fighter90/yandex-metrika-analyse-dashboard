import { z } from 'zod';
import type { ReportSnapshot, GeneratedDecisions, GeneratedHypotheses } from '@pca/shared';
import { snapshotFacts } from './ai-insights';
import type { AnthropicFetch } from './ai-insights';
import { ANTHROPIC_URL, ANTHROPIC_VERSION } from './ai-insights';

export type { AnthropicFetch };
export { ANTHROPIC_URL };

export interface AnthropicDecisionsRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly system: string;
  readonly messages: readonly { role: 'user'; content: string }[];
}

/**
 * Build the Anthropic request that asks the model to propose Decision Log entries from the
 * snapshot + the already-generated hypotheses. Pure/deterministic given the same inputs.
 * Enforces «заявка ≠ оплата», anti-hallucination, and strict JSON output.
 */
export function buildDecisionsRequest(
  snapshot: ReportSnapshot,
  hypotheses: GeneratedHypotheses,
  model: string,
): AnthropicDecisionsRequest {
  const system =
    'Ты продуктовый аналитик ProductCamp. Отвечай СТРОГО JSON — никакого текста до или после ' +
    'фигурных скобок. Используй ТОЛЬКО числа и факты из данных снапшота — НИЧЕГО не выдумывай. ' +
    'ПРИНЦИП «заявка ≠ оплата»: b2cApplications — заявки (достижения цели), b2bPaidTickets — ' +
    'реально оплаченные билеты. Формат ответа: JSON объект {"decisions":[...]}. ' +
    'decisions — массив ≥3 объектов вида {"id":"DL01","hypothesisId":"S01","method":"...",' +
    '"periodDays":N,"scope":"...","findings":"...","confidence":"low|medium|high",' +
    '"evidence":"...","source":"...","outcome":"green|yellow|red","outcomeRationale":"..."}. ' +
    'hypothesisId — id одной из переданных гипотез. periodDays — целое > 0. ' +
    'evidence — конкретное число из снапшота. source — id снапшота. ' +
    'outcome: green — продолжать, yellow — доработать, red — отказаться. ' +
    'Все строки — на русском. Ответ — валидный JSON без markdown-обёртки.';

  const hypIds = [
    ...hypotheses.problems.map((p) => p.id),
    ...hypotheses.solutions.map((s) => s.id),
  ].join(', ');

  const user =
    `Снапшот ${snapshot.id}. Данные:\n${snapshotFacts(snapshot)}\n\n` +
    `Доступные гипотезы (id): ${hypIds}.\n\n` +
    'Сгенерируй минимум 3 предполагаемых решения (Decision Log) на основе данных и гипотез выше. ' +
    'Каждое решение привязано к id гипотезы и опирается на конкретное число из данных. ' +
    'Строго соблюдай принцип «заявка ≠ оплата». Верни только JSON.';

  return { model, max_tokens: 4000, system, messages: [{ role: 'user', content: user }] };
}

const GeneratedDecisionSchema = z.object({
  id: z.string().min(1),
  hypothesisId: z.string().min(1),
  method: z.string().min(1),
  periodDays: z.number().int().positive(),
  scope: z.string().min(1),
  findings: z.string().min(1),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.string().min(1),
  source: z.string().min(1),
  outcome: z.enum(['green', 'yellow', 'red']),
  outcomeRationale: z.string().min(1),
});

const RawDecisionsSchema = z.object({
  decisions: z.array(GeneratedDecisionSchema).min(3),
});

/**
 * Parse + validate the AI's JSON output. Throws a descriptive error on invalid JSON or when the
 * shape does not match (includes fewer than 3 decisions).
 */
export function parseDecisions(text: string): GeneratedDecisions {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('AI returned invalid JSON for decisions');
  }

  const parsed = RawDecisionsSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `Decisions response did not match the expected schema: ${parsed.error.message}`,
    );
  }
  return { decisions: parsed.data.decisions };
}

/**
 * Call Anthropic to propose Decision Log entries. Throws when the HTTP response is non-2xx or the
 * returned JSON fails validation. Never logs the API key.
 */
export async function generateDecisions(
  snapshot: ReportSnapshot,
  hypotheses: GeneratedHypotheses,
  deps: { fetch: AnthropicFetch; apiKey: string; model: string },
): Promise<GeneratedDecisions> {
  const res = await deps.fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': deps.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(buildDecisionsRequest(snapshot, hypotheses, deps.model)),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic decisions request failed (HTTP ${res.status}): ${raw}`);
  }

  const ResponseSchema = z.object({
    content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  });
  const envelope = ResponseSchema.safeParse(JSON.parse(raw));
  if (!envelope.success) {
    throw new Error('Anthropic response envelope did not match the expected schema');
  }
  const modelText = envelope.data.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim();

  return parseDecisions(modelText);
}
