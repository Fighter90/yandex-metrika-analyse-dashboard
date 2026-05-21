import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { DB } from './connection';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

interface MigrationRow {
  readonly name: string;
}

/**
 * Apply pending `.sql` migrations in filename order, each in its own transaction.
 * Idempotent: already-applied files (tracked in `_migrations`) are skipped.
 * Returns the names applied during this call.
 */
export function migrate(db: DB): string[] {
  db.exec(
    'CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  const appliedRows = db.prepare('SELECT name FROM _migrations').all() as MigrationRow[];
  const applied = new Set(appliedRows.map((r) => r.name));

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const insert = db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)');
  const applyOne = db.transaction((file: string) => {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
    insert.run(file, new Date().toISOString());
  });

  const ran: string[] = [];
  for (const file of files) {
    if (!applied.has(file)) {
      applyOne(file);
      ran.push(file);
    }
  }
  return ran;
}
