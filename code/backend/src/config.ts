import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for runtime configuration.
 * Values come from `.env` (gitignored). Never log the token or client secret.
 */
const EnvSchema = z.object({
  YANDEX_OAUTH_TOKEN: z.string().default(''),
  YANDEX_CLIENT_ID: z.string().default(''),
  YANDEX_CLIENT_SECRET: z.string().default(''),
  OAUTH_REDIRECT_URI: z.string().default('https://oauth.yandex.ru/verification_code'),
  COUNTER_ID: z.coerce.number().int().positive().default(54280963),
  TIMEZONE: z.string().default('Europe/Moscow'),
  PORT: z.coerce.number().int().default(5173),
  API_PORT: z.coerce.number().int().default(4000),
  ARCHIVED_GOAL_ID_THRESHOLD: z.coerce.number().int().default(77),
  LOW_UTM_COVERAGE_RATIO: z.coerce.number().default(0.7),
});

export const config = EnvSchema.parse(process.env);
export type AppConfig = typeof config;

/** True once a real OAuth token (not the placeholder) is present. */
export const hasMetrikaToken = (): boolean =>
  config.YANDEX_OAUTH_TOKEN.length > 0 &&
  config.YANDEX_OAUTH_TOKEN !== 'YOUR_OAUTH_TOKEN_HERE';
