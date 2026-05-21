import Database from 'better-sqlite3';

export type DB = Database.Database;

/**
 * Open a SQLite database. Use ':memory:' in tests, a file path in production.
 * Enables WAL (durability/concurrency) and foreign-key enforcement.
 */
export function openDb(path: string): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
