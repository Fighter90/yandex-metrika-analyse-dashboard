import { z } from 'zod';
import { iceScore } from '@pca/shared';
import type { ReportSnapshot, GeneratedHypotheses } from '@pca/shared';
import { snapshotFacts } from './ai-insights';
import type { AnthropicFetch } from './ai-insights';
import { ANTHROPIC_URL, ANTHROPIC_VERSION } from './ai-insights';

export type { AnthropicFetch };
export { ANTHROPIC_URL };

// ---------------------------------------------------------------------------
// Request builder
// ---------------------------------------------------------------------------

export interface AnthropicHypothesesRequest {
  readonly model: string;
  readonly max_tokens: number;
  readonly system: string;
  readonly messages: readonly { role: 'user'; content: string }[];
}

/**
 * Build the Anthropic request that asks the model to generate structured hypotheses.
 * Pure and deterministic given the same snapshot + model.
 *
 * The system prompt enforces:
 *   • «заявка ≠ оплата» — the model must not confuse goal reaches with paid tickets.
 *   • Anti-hallucination — only numbers present in the snapshot facts may be cited.
 *   • Strict JSON output matching GeneratedHypotheses minus ice.score (we compute that).
 *   • ≥10 problem hypotheses, ≥10 solution hypotheses.
 */
export function buildHypothesesRequest(
  snapshot: ReportSnapshot,
  model: string,
): AnthropicHypothesesRequest {
  const system =
    'Ты продуктовый аналитик ProductCamp. Отвечай СТРОГО JSON — никакого текста до или после ' +
    'фигурных скобок. Используй ТОЛЬКО числа и факты из данных снапшота — НИЧЕГО не выдумывай. ' +
    'ПРИНЦИП «заявка ≠ оплата»: b2cApplications — это достижения цели (заявки), а не оплаты; ' +
    'b2bPaidTickets — реально оплаченные B2B-билеты. Не путай эти два числа. ' +
    'Формат ответа: JSON объект {"problems":[...],"solutions":[...]}. ' +
    'problems — массив ≥10 объектов вида ' +
    '{"id":"P01","segment":"...","trouble":"...","action":"...","barrier":"...","evidence":"..."}. ' +
    'Формула проблемы: «[segment] испытывает [trouble] при [action], потому что [barrier]». ' +
    'evidence — ссылка на конкретное число из данных снапшота (например «287 заявок B2C»). ' +
    'solutions — массив ≥10 объектов вида ' +
    '{"id":"S01","problemId":"P01","action":"...","userBenefit":"...","businessResult":"...",' +
    '"successCriteria":"...","risks":[...],"validation":{...},"ice":{...}}. ' +
    'Формула решения: «Если [action], то [userBenefit], что приведёт к [businessResult]». ' +
    'successCriteria — измеримый критерий («увеличим конверсию на X%» или «снизим отток на Y%»). ' +
    'risks — ровно 5 объектов: {"kind":"value","note":"..."},{"kind":"usability","note":"..."},' +
    '{"kind":"feasibility","note":"..."},{"kind":"business","note":"..."},{"kind":"legal","note":"..."}. ' +
    'validation — объект {"whatToVerify":"...","methods":["метод1","метод2"],"audience":"...",' +
    '"channel":"...","successCriteria":"..."}; минимум 2 метода. ' +
    'ice — объект {"impact":N,"confidence":N,"ease":N,"impactRationale":"...","confidenceRationale":"...",' +
    '"easeRationale":"..."} где N — целое 1–10; НЕ включай поле score (оно вычисляется детерминированно). ' +
    'Все строки — на русском языке. Ответ должен быть валидным JSON без markdown-обёртки.';

  const user =
    `Снапшот ${snapshot.id}. Данные:\n${snapshotFacts(snapshot)}\n\n` +
    'Сгенерируй минимум 10 гипотез проблем и минимум 10 гипотез решений для команды трека ' +
    '«Конверсии и лидген». Каждая гипотеза должна опираться на конкретные числа из данных выше. ' +
    'Каждое решение должно ссылаться на id соответствующей проблемы. ' +
    'Строго соблюдай принцип «заявка ≠ оплата». Верни только JSON.';

  return { model, max_tokens: 8000, system, messages: [{ role: 'user', content: user }] };
}

// ---------------------------------------------------------------------------
// Zod schema for the raw AI response (without ice.score — we compute it)
// ---------------------------------------------------------------------------

const SolutionRiskKindSchema = z.enum(['value', 'usability', 'feasibility', 'business', 'legal']);

const SolutionRiskSchema = z.object({
  kind: SolutionRiskKindSchema,
  note: z.string().min(1),
});

const ValidationPlanSchema = z.object({
  whatToVerify: z.string().min(1),
  methods: z.array(z.string().min(1)).min(2),
  audience: z.string().min(1),
  channel: z.string().min(1),
  successCriteria: z.string().min(1),
});

const IceInputSchema = z.object({
  impact: z.number().int().min(1).max(10),
  confidence: z.number().int().min(1).max(10),
  ease: z.number().int().min(1).max(10),
  impactRationale: z.string().min(1),
  confidenceRationale: z.string().min(1),
  easeRationale: z.string().min(1),
});

const ProblemHypothesisSchema = z.object({
  id: z.string().min(1),
  segment: z.string().min(1),
  trouble: z.string().min(1),
  action: z.string().min(1),
  barrier: z.string().min(1),
  evidence: z.string().min(1),
});

const SolutionHypothesisSchema = z.object({
  id: z.string().min(1),
  problemId: z.string().min(1),
  action: z.string().min(1),
  userBenefit: z.string().min(1),
  businessResult: z.string().min(1),
  successCriteria: z.string().min(1),
  risks: z.array(SolutionRiskSchema).length(5),
  validation: ValidationPlanSchema,
  ice: IceInputSchema,
});

const RawHypothesesSchema = z.object({
  problems: z.array(ProblemHypothesisSchema).min(10),
  solutions: z.array(SolutionHypothesisSchema).min(10),
});

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * Parse and validate the AI's JSON output.
 * Throws a descriptive error if:
 *   • The text is not valid JSON.
 *   • The shape does not match RawHypothesesSchema (includes <10 problems or <10 solutions).
 * For each solution, ice.score is computed deterministically via iceScore() — the AI value
 * is never trusted.
 */
export function parseHypotheses(text: string): GeneratedHypotheses {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('AI returned invalid JSON for hypotheses');
  }

  const parsed = RawHypothesesSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `Hypotheses response did not match the expected schema: ${parsed.error.message}`,
    );
  }

  const { problems, solutions } = parsed.data;

  return {
    problems,
    solutions: solutions.map((s) => ({
      ...s,
      ice: {
        ...s.ice,
        score: iceScore(s.ice.impact, s.ice.confidence, s.ice.ease),
      },
    })),
  };
}

// ---------------------------------------------------------------------------
// Generator (injectable fetch — same pattern as generateInsights)
// ---------------------------------------------------------------------------

/**
 * Call Anthropic to generate structured hypotheses from the snapshot.
 * Throws when the Anthropic key is absent, the HTTP response is non-2xx,
 * or parseHypotheses() rejects the returned JSON.
 * Never logs the API key.
 */
export async function generateHypotheses(
  snapshot: ReportSnapshot,
  deps: { fetch: AnthropicFetch; apiKey: string; model: string },
): Promise<GeneratedHypotheses> {
  const res = await deps.fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': deps.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json',
    },
    body: JSON.stringify(buildHypothesesRequest(snapshot, deps.model)),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic hypotheses request failed (HTTP ${res.status}): ${raw}`);
  }

  // The Anthropic Messages response wraps the model's reply in content[].text blocks.
  // Extract the first text block — that should be the JSON.
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

  return parseHypotheses(modelText);
}
