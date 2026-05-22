import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { config } from '../config';
import { authorizeUrl, exchangeCodeForToken, upsertEnvVar, type OAuthFetch } from './oauth';

/**
 * CLI entry for `pnpm --filter @pca/backend auth`. Walks the Yandex OAuth authorization-code flow:
 * prints the authorize URL, reads the confirmation code, exchanges it for a token and writes
 * YANDEX_OAUTH_TOKEN into .env. Excluded from coverage (interactive IO); oauth.ts is the tested part.
 */
const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../../.env');

if (!config.YANDEX_CLIENT_ID || !config.YANDEX_CLIENT_SECRET) {
  console.error('YANDEX_CLIENT_ID / YANDEX_CLIENT_SECRET must be set in .env first.');
  process.exit(1);
}

console.log('\n1) Откройте ссылку в браузере и подтвердите доступ (scope metrika:read):\n');
console.log(`   ${authorizeUrl(config.YANDEX_CLIENT_ID, config.OAUTH_REDIRECT_URI)}\n`);
console.log('2) Скопируйте код подтверждения со страницы Яндекса и вставьте сюда.\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });
const code = (await rl.question('Код подтверждения: ')).trim();
rl.close();

const token = await exchangeCodeForToken(globalThis.fetch as unknown as OAuthFetch, {
  code,
  clientId: config.YANDEX_CLIENT_ID,
  clientSecret: config.YANDEX_CLIENT_SECRET,
});

const current = readFileSync(ENV_PATH, 'utf8');
writeFileSync(ENV_PATH, upsertEnvVar(current, 'YANDEX_OAUTH_TOKEN', token.accessToken));

console.log(
  `\n✓ Токен получен и записан в .env (длина ${token.accessToken.length}, ` +
    `действует ~${Math.round(token.expiresIn / 86400)} дн.). Теперь запустите: pnpm sync\n`,
);
