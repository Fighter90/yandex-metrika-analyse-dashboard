import { openDb } from './connection';
import { migrate } from './migrate';
import { config } from '../config';

/** CLI entry for `pnpm --filter @pca/backend migrate`. Excluded from coverage (bootstrap). */
const db = openDb(config.DB_PATH);
const applied = migrate(db);
console.log(
  applied.length > 0 ? `Applied migrations: ${applied.join(', ')}` : 'No pending migrations',
);
db.close();
