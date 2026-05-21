import type { DB } from '../connection';
import {
  validateHypothesis,
  type Hypothesis,
  type HypothesisStatus,
  type NewHypothesis,
} from '@pca/shared';

/** Thrown when a hypothesis fails the Voronkova completeness check at the repo boundary. */
export class HypothesisValidationError extends Error {
  constructor(public readonly errors: readonly string[]) {
    super(`Invalid hypothesis: ${errors.join('; ')}`);
    this.name = 'HypothesisValidationError';
  }
}

interface HypRow {
  id: number;
  diamond_phase: Hypothesis['diamondPhase'];
  kind: Hypothesis['kind'];
  subject: string;
  action: string;
  solution: string;
  condition: string;
  title: string;
  description: string | null;
  parent_id: number | null;
  hidden_assumptions: string;
  validation_methods: string;
  impact: number;
  confidence: number;
  ease: number;
  impact_rationale: string;
  confidence_rationale: string;
  ease_rationale: string;
  ice_score: number;
  green_criteria: string;
  yellow_criteria: string;
  red_criteria: string;
  deadline_days: number;
  deadline_at: string;
  evidence: string | null;
  status: HypothesisStatus;
  created_at: string;
  updated_at: string;
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();
}

function toHypothesis(r: HypRow): Hypothesis {
  return {
    id: r.id,
    diamondPhase: r.diamond_phase,
    kind: r.kind,
    subject: r.subject,
    action: r.action,
    solution: r.solution,
    condition: r.condition,
    title: r.title,
    description: r.description ?? undefined,
    parentId: r.parent_id ?? undefined,
    hiddenAssumptions: JSON.parse(r.hidden_assumptions),
    validationMethods: JSON.parse(r.validation_methods),
    impact: r.impact,
    confidence: r.confidence,
    ease: r.ease,
    impactRationale: r.impact_rationale,
    confidenceRationale: r.confidence_rationale,
    easeRationale: r.ease_rationale,
    iceScore: r.ice_score,
    greenCriteria: r.green_criteria,
    yellowCriteria: r.yellow_criteria,
    redCriteria: r.red_criteria,
    deadlineDays: r.deadline_days,
    deadlineAt: r.deadline_at,
    evidence: r.evidence ? JSON.parse(r.evidence) : undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class HypothesesRepo {
  constructor(private readonly db: DB) {}

  /** Persists a hypothesis. Rejects (throws) anything failing the Voronkova check. */
  create(input: NewHypothesis): Hypothesis {
    const result = validateHypothesis(input);
    if (!result.ok) throw new HypothesisValidationError(result.errors);

    const now = new Date().toISOString();
    const row = this.db
      .prepare(
        `INSERT INTO hypotheses (
           diamond_phase, kind, subject, action, solution, condition, title, description,
           parent_id, hidden_assumptions, validation_methods,
           impact, confidence, ease, impact_rationale, confidence_rationale, ease_rationale,
           green_criteria, yellow_criteria, red_criteria,
           deadline_days, deadline_at, evidence, status, created_at, updated_at
         ) VALUES (
           @diamond_phase, @kind, @subject, @action, @solution, @condition, @title, @description,
           @parent_id, @hidden_assumptions, @validation_methods,
           @impact, @confidence, @ease, @impact_rationale, @confidence_rationale, @ease_rationale,
           @green_criteria, @yellow_criteria, @red_criteria,
           @deadline_days, @deadline_at, @evidence, 'draft', @created_at, @updated_at
         ) RETURNING *`,
      )
      .get({
        diamond_phase: input.diamondPhase,
        kind: input.kind,
        subject: input.subject,
        action: input.action,
        solution: input.solution,
        condition: input.condition,
        title: input.title,
        description: input.description ?? null,
        parent_id: input.parentId ?? null,
        hidden_assumptions: JSON.stringify(input.hiddenAssumptions),
        validation_methods: JSON.stringify(input.validationMethods),
        impact: input.impact,
        confidence: input.confidence,
        ease: input.ease,
        impact_rationale: input.impactRationale,
        confidence_rationale: input.confidenceRationale,
        ease_rationale: input.easeRationale,
        green_criteria: input.greenCriteria,
        yellow_criteria: input.yellowCriteria,
        red_criteria: input.redCriteria,
        deadline_days: input.deadlineDays,
        deadline_at: addDays(now, input.deadlineDays),
        evidence: input.evidence ? JSON.stringify(input.evidence) : null,
        created_at: now,
        updated_at: now,
      }) as HypRow;
    return toHypothesis(row);
  }

  getById(id: number): Hypothesis | undefined {
    const r = this.db.prepare('SELECT * FROM hypotheses WHERE id = ?').get(id) as
      | HypRow
      | undefined;
    return r ? toHypothesis(r) : undefined;
  }

  /** All hypotheses, highest ICE first (the default dashboard ordering). */
  list(): Hypothesis[] {
    return (
      this.db.prepare('SELECT * FROM hypotheses ORDER BY ice_score DESC, id').all() as HypRow[]
    ).map(toHypothesis);
  }

  updateStatus(id: number, status: HypothesisStatus): Hypothesis | undefined {
    const r = this.db
      .prepare('UPDATE hypotheses SET status = @status, updated_at = @u WHERE id = @id RETURNING *')
      .get({ id, status, u: new Date().toISOString() }) as HypRow | undefined;
    return r ? toHypothesis(r) : undefined;
  }
}
