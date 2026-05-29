import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { applyInitValues } from './init-env';

/**
 * CLI for `./init.sh` (`pnpm --filter @pca/backend configure`). Interactively collects the Anthropic
 * key, the Yandex OAuth app credentials (ClientID/Client secret) and Metrika launch params, then
 * writes them into .env (preserving other lines). Excluded from coverage (interactive IO);
 * applyInitValues is the tested pure part. The token exchange itself is handled by `pnpm auth`.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');
const ENV_PATH = join(ROOT, '.env');
const EXAMPLE_PATH = join(ROOT, '.env.example');

if (!existsSync(ENV_PATH)) {
  copyFileSync(EXAMPLE_PATH, ENV_PATH);
  console.log('→ Создан .env из .env.example');
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (q: string, fallback = ''): Promise<string> => {
  const a = (await rl.question(fallback ? `${q} [${fallback}]: ` : `${q}: `)).trim();
  return a || fallback;
};

console.log('\n=== Инициализация ProductCamp Analytics ===');
console.log('Пустой ввод оставляет текущее значение.\n');

const anthropicKey = await ask('Anthropic API key (для AI-анализа; можно пропустить)');
console.log('\nOAuth-приложение Яндекс.Метрики (https://oauth.yandex.ru, scope metrika:read).');
console.log('ClientID и Client secret берутся из карточки приложения.');
const clientId = await ask('Yandex OAuth ClientID (обязательно для живого sync)');
const clientSecret = await ask('Yandex OAuth Client secret (обязательно для живого sync)');
const counterId = await ask('ID счётчика Яндекс.Метрики (обязательно для живого sync)');
const goalId = await ask('ID цели KPI (0 = авто-определение основной цели оплаты)', '0');
rl.close();

const updated = applyInitValues(readFileSync(ENV_PATH, 'utf8'), {
  anthropicKey,
  clientId,
  clientSecret,
  counterId,
  goalId,
});
writeFileSync(ENV_PATH, updated);

console.log('\n✓ .env обновлён.');
console.log('Дальше:');
console.log('  • OAuth Яндекс.Метрики:  pnpm auth   (затем данные тянутся живьём)');
console.log('  • Запуск:                ./run.sh    (без токена — демо-данные)\n');
