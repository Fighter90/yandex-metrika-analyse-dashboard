import { openDb } from './connection';
import { migrate } from './migrate';
import { config } from '../config';
import { MetricsRepo } from './repositories/metrics-repo';
import { B2bRepo } from './repositories/b2b-repo';
import { HypothesesRepo } from './repositories/hypotheses-repo';
import { DecisionsRepo } from './repositories/decisions-repo';
import { buildSeedData } from './seed-data';
import { buildSeedHypotheses, buildSeedDecisions } from './seed-hypotheses';

/**
 * CLI entry for `pnpm --filter @pca/backend seed`. Populates SQLite with deterministic demo data so
 * the dashboard is usable without an OAuth token. Excluded from coverage (bootstrap + IO);
 * buildSeedData / buildSeedHypotheses / buildSeedDecisions are the tested pure parts.
 */
const db = openDb(config.DB_PATH);
migrate(db);

const metrics = new MetricsRepo(db);
const b2b = new B2bRepo(db);
const hypotheses = new HypothesesRepo(db);
const decisions = new DecisionsRepo(db);
const data = buildSeedData();

metrics.upsertGoals(data.goals);
metrics.upsertChannelStats(data.channels);
metrics.upsertUtmStats(data.utm);
metrics.upsertGeoDeviceStats(data.geoDevice);
metrics.upsertPageStats(data.pages);
metrics.upsertExitPageStats(data.exitPages);
for (const deal of data.b2b) b2b.create(deal);

// Hypotheses reference each other (parentId) and decisions reference hypotheses by 1-based index
// into the seed array; remap those placeholders to the real DB ids assigned on insert.
const createdIds: number[] = [];
for (const h of buildSeedHypotheses()) {
  const parentId = h.parentId !== undefined ? createdIds[h.parentId - 1] : undefined;
  createdIds.push(hypotheses.create({ ...h, parentId }).id);
}
for (const d of buildSeedDecisions()) {
  const hypothesisId = createdIds[d.hypothesisId - 1];
  if (hypothesisId !== undefined) decisions.create({ ...d, hypothesisId });
}

console.log(
  `Seeded demo data: ${data.channels.length} channel rows, ${data.utm.length} UTM, ` +
    `${data.geoDevice.length} geo/device, ${data.pages.length} entry + ${data.exitPages.length} exit pages, ` +
    `${data.b2b.length} B2B deals, ${data.goals.length} goals, ${createdIds.length} hypotheses, ` +
    `${buildSeedDecisions().length} decisions.`,
);
db.close();
