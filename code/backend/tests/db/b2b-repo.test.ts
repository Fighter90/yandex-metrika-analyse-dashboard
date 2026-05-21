import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { DB } from '../../src/db/connection';
import { B2bRepo } from '../../src/db/repositories/b2b-repo';
import { freshDb } from './helpers';

let db: DB;
let repo: B2bRepo;

beforeEach(() => {
  db = freshDb();
  repo = new B2bRepo(db);
});
afterEach(() => db.close());

describe('B2bRepo', () => {
  it('creates a full deal and a minimal one (optional fields → undefined)', () => {
    const full = repo.create({
      company: 'BigCorp',
      tickets: 20,
      stage: 'negotiation',
      amountRub: 280000,
      contactEmail: 'cpo@bigcorp.ru',
      notes: 'через финдира',
      dateAdded: '2025-01-01',
      datePaid: undefined,
    });
    expect(full.amountRub).toBe(280000);
    expect(full.contactEmail).toBe('cpo@bigcorp.ru');

    const minimal = repo.create({
      company: 'SmallCo',
      tickets: 3,
      stage: 'lead',
      dateAdded: '2025-01-02',
    });
    expect(minimal.amountRub).toBeUndefined();
    expect(minimal.contactEmail).toBeUndefined();
    expect(minimal.notes).toBeUndefined();
    expect(minimal.datePaid).toBeUndefined();
  });

  it('lists and reads deals by id', () => {
    const d = repo.create({ company: 'A', tickets: 5, stage: 'lead', dateAdded: '2025-01-01' });
    expect(repo.list()).toHaveLength(1);
    expect(repo.getById(d.id)?.company).toBe('A');
    expect(repo.getById(9999)).toBeUndefined();
  });

  it('updates stage (with and without a payment date) and reports missing rows', () => {
    const d = repo.create({ company: 'A', tickets: 5, stage: 'lead', dateAdded: '2025-01-01' });
    const paid = repo.updateStage(d.id, 'paid', '2025-01-05');
    expect(paid?.stage).toBe('paid');
    expect(paid?.datePaid).toBe('2025-01-05');

    const noDate = repo.updateStage(d.id, 'invoiced');
    expect(noDate?.stage).toBe('invoiced');
    expect(noDate?.datePaid).toBeUndefined();

    expect(repo.updateStage(9999, 'paid')).toBeUndefined();
  });

  it('removes deals and reports whether a row was deleted', () => {
    const d = repo.create({ company: 'A', tickets: 5, stage: 'lead', dateAdded: '2025-01-01' });
    expect(repo.remove(d.id)).toBe(true);
    expect(repo.remove(d.id)).toBe(false);
  });
});
