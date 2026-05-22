import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';

// Resolve the repo root from this file (code/backend/src) so .env and the SQLite file
// are found regardless of the working directory a script is invoked from.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
loadEnv({ path: join(REPO_ROOT, '.env') });

/**
 * Single source of truth for runtime configuration.
 * Values come from `.env` (gitignored). Never log the token or client secret.
 */
const EnvSchema = z.object({
  YANDEX_OAUTH_TOKEN: z.string().default(''),
  YANDEX_CLIENT_ID: z.string().default(''),
  YANDEX_CLIENT_SECRET: z.string().default(''),
  OAUTH_REDIRECT_URI: z.string().default('https://oauth.yandex.ru/verification_code'),
  // Yandex Metrika counter id. Not hardcoded — supply it via .env (./init.sh asks for it).
  // 0 (default) = not configured: demo/seed mode works, but a live sync requires a real id.
  COUNTER_ID: z.coerce.number().int().nonnegative().default(0),
  // The Metrika goal that counts for the KPI. 0 (default) = auto-detect the primary purchase/payment
  // goal from the goals list at sync time (selectPrimaryGoal); set a specific id only to override.
  GOAL_ID: z.coerce.number().int().default(0),
  // AI report narrative (Anthropic). Empty key → AI analysis is unavailable, dashboard still works.
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),
  TIMEZONE: z.string().default('Europe/Moscow'),
  PORT: z.coerce.number().int().default(5173),
  API_PORT: z.coerce.number().int().default(4000),
  ARCHIVED_GOAL_ID_THRESHOLD: z.coerce.number().int().default(77),
  LOW_UTM_COVERAGE_RATIO: z.coerce.number().default(0.7),
  DB_PATH: z.string().default(join(REPO_ROOT, 'data', 'productcamp.sqlite')),
});

export const config = EnvSchema.parse(process.env);
export type AppConfig = typeof config;

/** True once a real OAuth token (not the placeholder) is present. Pure for testability. */
export const hasMetrikaToken = (token: string = config.YANDEX_OAUTH_TOKEN): boolean =>
  token.length > 0 && token !== 'YOUR_OAUTH_TOKEN_HERE';

/** True once an Anthropic API key (not the placeholder) is present. Pure for testability. */
export const hasAnthropicKey = (key: string = config.ANTHROPIC_API_KEY): boolean =>
  key.length > 0 && key !== 'YOUR_ANTHROPIC_API_KEY_HERE';

/** True once a Metrika counter id is configured (a live sync needs it). Pure for testability. */
export const hasCounterId = (id: number = config.COUNTER_ID): boolean => id > 0;
