import type { DB } from '../connection';
import type { B2bDeal, NewB2bDeal } from '@pca/shared';

interface B2bRow {
  id: number;
  company: string;
  tickets: number;
  stage: B2bDeal['stage'];
  amount_rub: number | null;
  contact_email: string | null;
  notes: string | null;
  date_added: string;
  date_paid: string | null;
}

function toDeal(r: B2bRow): B2bDeal {
  return {
    id: r.id,
    company: r.company,
    tickets: r.tickets,
    stage: r.stage,
    amountRub: r.amount_rub ?? undefined,
    contactEmail: r.contact_email ?? undefined,
    notes: r.notes ?? undefined,
    dateAdded: r.date_added,
    datePaid: r.date_paid ?? undefined,
  };
}

/** CRUD for the manually-entered B2B pipeline (Metrika does not cover it). */
export class B2bRepo {
  constructor(private readonly db: DB) {}

  create(input: NewB2bDeal): B2bDeal {
    const row = this.db
      .prepare(
        `INSERT INTO b2b_manual
           (company, tickets, stage, amount_rub, contact_email, notes, date_added, date_paid)
         VALUES (@company, @tickets, @stage, @amount_rub, @contact_email, @notes, @date_added, @date_paid)
         RETURNING *`,
      )
      .get({
        company: input.company,
        tickets: input.tickets,
        stage: input.stage,
        amount_rub: input.amountRub ?? null,
        contact_email: input.contactEmail ?? null,
        notes: input.notes ?? null,
        date_added: input.dateAdded,
        date_paid: input.datePaid ?? null,
      }) as B2bRow;
    return toDeal(row);
  }

  list(): B2bDeal[] {
    return (this.db.prepare('SELECT * FROM b2b_manual ORDER BY id').all() as B2bRow[]).map(toDeal);
  }

  getById(id: number): B2bDeal | undefined {
    const r = this.db.prepare('SELECT * FROM b2b_manual WHERE id = ?').get(id) as
      | B2bRow
      | undefined;
    return r ? toDeal(r) : undefined;
  }

  /** Update a deal's stage and optional payment date. Returns the updated deal, or undefined. */
  updateStage(id: number, stage: B2bDeal['stage'], datePaid?: string): B2bDeal | undefined {
    const r = this.db
      .prepare(
        `UPDATE b2b_manual SET stage = @stage, date_paid = @date_paid WHERE id = @id RETURNING *`,
      )
      .get({ id, stage, date_paid: datePaid ?? null }) as B2bRow | undefined;
    return r ? toDeal(r) : undefined;
  }

  remove(id: number): boolean {
    return this.db.prepare('DELETE FROM b2b_manual WHERE id = ?').run(id).changes > 0;
  }
}
