import { config, hasMetrikaToken } from '../config';
import { makeSyncRunner } from './production-sync';

/** CLI: `pnpm --filter @pca/backend sync --from=YYYY-MM-DD --to=YYYY-MM-DD`. Excluded from coverage. */
function arg(name: string): string | undefined {
  const flag = `--${name}=`;
  return process.argv.find((a) => a.startsWith(flag))?.slice(flag.length);
}

async function main(): Promise<void> {
  if (!hasMetrikaToken()) {
    console.log('sync: no YANDEX_OAUTH_TOKEN set — skipping. Fill .env and re-run `pnpm sync`.');
    return;
  }
  const to = arg('to') ?? new Date().toISOString().slice(0, 10);
  const from = arg('from') ?? new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
  const goalIdRaw = arg('goalId');
  const summary = await makeSyncRunner()({
    from,
    to,
    goalId: goalIdRaw ? Number(goalIdRaw) : undefined,
  });
  console.log(`sync done (counter ${config.COUNTER_ID}):`, summary);
}

void main();
