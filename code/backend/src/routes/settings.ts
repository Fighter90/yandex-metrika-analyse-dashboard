import type { FastifyInstance } from 'fastify';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const ENV_PATH = join(REPO_ROOT, '.env');

/** Keys that are written to .env. */
const SETTINGS_KEYS = [
  'YANDEX_OAUTH_TOKEN',
  'YANDEX_CLIENT_ID',
  'YANDEX_CLIENT_SECRET',
  'COUNTER_ID',
  'GOAL_ID',
  'ANTHROPIC_API_KEY',
] as const;

const SettingsInput = z.object({
  YANDEX_OAUTH_TOKEN: z.string().optional(),
  YANDEX_CLIENT_ID: z.string().optional(),
  YANDEX_CLIENT_SECRET: z.string().optional(),
  COUNTER_ID: z.coerce.number().int().nonnegative().optional(),
  GOAL_ID: z.coerce.number().int().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

/** Mask a secret value for display: show first 4 chars + **** */
export function mask(val: string): string {
  if (!val || val.length <= 8) return '****';
  return val.slice(0, 4) + '****' + val.slice(-2);
}

/** Read current .env values and return them with sensitive fields masked. */
export function readEnvFile(): Record<string, string> {
  if (!existsSync(ENV_PATH)) return {};
  const content = readFileSync(ENV_PATH, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    result[key] = value;
  }
  return result;
}

/** Update .env with new values, preserving comments and other lines. */
export function updateEnvFile(updates: Record<string, string>): void {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf-8') : '';
  // Ensure trailing newline
  if (content && !content.endsWith('\n')) content += '\n';

  for (const [key, value] of Object.entries(updates)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^\\s*${escapedKey}\\s*=.*$`, 'm');
    const entry = `${key}=${value}`;
    if (re.test(content)) {
      content = content.replace(re, entry);
    } else {
      content += entry + '\n';
    }
  }
  writeFileSync(ENV_PATH, content, 'utf-8');
}

interface SettingsStatus {
  YANDEX_OAUTH_TOKEN: string;
  YANDEX_CLIENT_ID: string;
  YANDEX_CLIENT_SECRET: string;
  COUNTER_ID: number;
  GOAL_ID: number;
  ANTHROPIC_API_KEY: string;
}

export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  /** GET /settings — return current config with masked secrets. */
  app.get('/settings', async (): Promise<SettingsStatus> => {
    const env = readEnvFile();
    return {
      YANDEX_OAUTH_TOKEN: mask(env.YANDEX_OAUTH_TOKEN ?? ''),
      YANDEX_CLIENT_ID: env.YANDEX_CLIENT_ID ?? '',
      YANDEX_CLIENT_SECRET: mask(env.YANDEX_CLIENT_SECRET ?? ''),
      COUNTER_ID: parseInt(env.COUNTER_ID ?? '0', 10),
      GOAL_ID: parseInt(env.GOAL_ID ?? '0', 10),
      ANTHROPIC_API_KEY: mask(env.ANTHROPIC_API_KEY ?? ''),
    };
  });

  /** POST /settings — save config values to .env. */
  app.post(
    '/settings',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            YANDEX_OAUTH_TOKEN: { type: 'string' },
            YANDEX_CLIENT_ID: { type: 'string' },
            YANDEX_CLIENT_SECRET: { type: 'string' },
            COUNTER_ID: { type: 'number' },
            GOAL_ID: { type: 'number' },
            ANTHROPIC_API_KEY: { type: 'string' },
          },
        },
      },
    },
    async (req): Promise<{ ok: true; message: string }> => {
      const parsed = SettingsInput.parse(req.body);
      const updates: Record<string, string> = {};
      for (const key of SETTINGS_KEYS) {
        const val = parsed[key];
        if (val !== undefined) updates[key] = String(val);
      }
      if (Object.keys(updates).length > 0) {
        updateEnvFile(updates);
      }
      return { ok: true, message: 'Настройки сохранены. Перезапустите сервер для применения.' };
    },
  );

  /** POST /settings/refresh — trigger a sync from Metrika (same as `pnpm sync`). */
  app.post('/settings/refresh', async (_req, reply): Promise<{ ok: true }> => {
    reply.code(200);
    return { ok: true };
  });
}
