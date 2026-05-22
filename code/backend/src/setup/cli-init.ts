import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { applyInitValues } from './init-env';

/**
 * CLI for `./init.sh` (`pnpm --filter @pca/backend configure`). Interactively collects the Anthropic
 * key + Metrika launch params and writes them into .env (preserving other lines). Excluded from
 * coverage (interactive IO); applyInitValues is the tested pure part. OAuth is handled by `pnpm auth`.
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
const counterId = await ask('ID счётчика Яндекс.Метрики', '54280963');
const goalId = await ask('ID цели KPI (0 = авто-определение основной цели оплаты)', '0');
rl.close();

const updated = applyInitValues(readFileSync(ENV_PATH, 'utf8'), {
  anthropicKey,
  counterId,
  goalId,
});
writeFileSync(ENV_PATH, updated);

console.log('\n✓ .env обновлён.');
console.log('Дальше:');
console.log('  • OAuth Яндекс.Метрики:  pnpm auth   (затем данные тянутся живьём)');
console.log('  • Запуск:                ./run.sh    (без токена — демо-данные)\n');
