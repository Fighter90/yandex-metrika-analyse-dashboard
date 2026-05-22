import type { DB } from '../connection';
import type { Decision, NewDecision } from '@pca/shared';

/** Thrown when a Decision Log entry lacks its required evidence base. */
export class DecisionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionValidationError';
  }
}

interface DecRow {
  id: number;
  number: string;
  hypothesis_id: number;
  date: string;
  method: Decision['method'];
  scope: string;
  period_days: number;
  findings: string;
  evidence: string;
  outcome: Decision['outcome'];
  outcome_rationale: string;
  next_step: string;
  responsible: string | null;
  next_deadline: string | null;
  previous_decision_id: number | null;
  spawned_hypothesis_ids: string | null;
  decided_by: string;
  participants: string | null;
  exported_md_path: string | null;
  created_at: string;
  updated_at: string;
}

function toDecision(r: DecRow): Decision {
  return {
    id: r.id,
    number: r.number,
    hypothesisId: r.hypothesis_id,
    date: r.date,
    method: r.method,
    scope: r.scope,
    periodDays: r.period_days,
    findings: JSON.parse(r.findings),
    evidence: JSON.parse(r.evidence),
    outcome: r.outcome,
    outcomeRationale: r.outcome_rationale,
    nextStep: r.next_step,
    responsible: r.responsible ?? undefined,
    nextDeadline: r.next_deadline ?? undefined,
    previousDecisionId: r.previous_decision_id ?? undefined,
    spawnedHypothesisIds: r.spawned_hypothesis_ids
      ? JSON.parse(r.spawned_hypothesis_ids)
      : undefined,
    decidedBy: r.decided_by,
    participants: r.participants ?? undefined,
    exportedMdPath: r.exported_md_path ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export class DecisionsRepo {
  constructor(private readonly db: DB) {}

  private nextNumber(): string {
    const { c } = this.db.prepare('SELECT COUNT(*) AS c FROM decisions').get() as { c: number };
    return `DL-${String(c + 1).padStart(3, '0')}`;
  }

  /**
   * Creates a Decision Log entry and, atomically, sets the linked hypothesis status to the
   * outcome (green/yellow/red). Evidence is required — the loop is not closed without it.
   */
  create(input: NewDecision): Decision {
    if (input.evidence.length === 0) {
      throw new DecisionValidationError('Decision requires at least one evidence item');
    }

    const now = new Date().toISOString();
    const insert = this.db.prepare(
      `INSERT INTO decisions (
         number, hypothesis_id, date, method, scope, period_days, findings, evidence,
         outcome, outcome_rationale, next_step, responsible, next_deadline,
         previous_decision_id, spawned_hypothesis_ids, decided_by, participants,
         created_at, updated_at
       ) VALUES (
         @number, @hypothesis_id, @date, @method, @scope, @period_days, @findings, @evidence,
         @outcome, @outcome_rationale, @next_step, @responsible, @next_deadline,
         @previous_decision_id, @spawned_hypothesis_ids, @decided_by, @participants,
         @created_at, @updated_at
       ) RETURNING *`,
    );
    const updateStatus = this.db.prepare(
      'UPDATE hypotheses SET status = @status, updated_at = @u WHERE id = @id',
    );

    const created = this.db.transaction((d: NewDecision): DecRow => {
      const row = insert.get({
        number: this.nextNumber(),
        hypothesis_id: d.hypothesisId,
        date: d.date,
        method: d.method,
        scope: d.scope,
        period_days: d.periodDays,
        findings: JSON.stringify(d.findings),
        evidence: JSON.stringify(d.evidence),
        outcome: d.outcome,
        outcome_rationale: d.outcomeRationale,
        next_step: d.nextStep,
        responsible: d.responsible ?? null,
        next_deadline: d.nextDeadline ?? null,
        previous_decision_id: d.previousDecisionId ?? null,
        spawned_hypothesis_ids: d.spawnedHypothesisIds
          ? JSON.stringify(d.spawnedHypothesisIds)
          : null,
        decided_by: d.decidedBy,
        participants: d.participants ?? null,
        created_at: now,
        updated_at: now,
      }) as DecRow;
      updateStatus.run({ status: d.outcome, u: now, id: d.hypothesisId });
      return row;
    })(input);

    return toDecision(created);
  }

  getById(id: number): Decision | undefined {
    const r = this.db.prepare('SELECT * FROM decisions WHERE id = ?').get(id) as DecRow | undefined;
    return r ? toDecision(r) : undefined;
  }

  listByHypothesis(hypothesisId: number): Decision[] {
    return (
      this.db
        .prepare('SELECT * FROM decisions WHERE hypothesis_id = ? ORDER BY date DESC, id DESC')
        .all(hypothesisId) as DecRow[]
    ).map(toDecision);
  }

  list(): Decision[] {
    return (
      this.db.prepare('SELECT * FROM decisions ORDER BY date DESC, id DESC').all() as DecRow[]
    ).map(toDecision);
  }
}
