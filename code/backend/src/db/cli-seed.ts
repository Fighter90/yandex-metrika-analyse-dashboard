import { openDb } from './connection';
import { migrate } from './migrate';
import { config } from '../config';
import { MetricsRepo } from './repositories/metrics-repo';
import { B2bRepo } from './repositories/b2b-repo';
import { buildSeedData } from './seed-data';

/**
 * CLI entry for `pnpm --filter @pca/backend seed`. Populates SQLite with deterministic demo data so
 * the dashboard is usable without an OAuth token. Excluded from coverage (bootstrap + IO);
 * buildSeedData is the tested pure part.
 */
const db = openDb(config.DB_PATH);
migrate(db);

const metrics = new MetricsRepo(db);
const b2b = new B2bRepo(db);
const data = buildSeedData();

metrics.upsertGoals(data.goals);
metrics.upsertChannelStats(data.channels);
metrics.upsertUtmStats(data.utm);
metrics.upsertGeoDeviceStats(data.geoDevice);
metrics.upsertPageStats(data.pages);
metrics.upsertExitPageStats(data.exitPages);
for (const deal of data.b2b) b2b.create(deal);

console.log(
  `Seeded demo data: ${data.channels.length} channel rows, ${data.utm.length} UTM, ` +
    `${data.geoDevice.length} geo/device, ${data.pages.length} entry + ${data.exitPages.length} exit pages, ` +
    `${data.b2b.length} B2B deals, ${data.goals.length} goals.`,
);
db.close();
