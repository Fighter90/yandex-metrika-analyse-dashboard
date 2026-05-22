#!/usr/bin/env bash
# Interactive setup: fills .env with the Anthropic key + Metrika launch params, and (optionally)
# runs the Yandex OAuth flow. Run after `pnpm install`, before `./run.sh`.
set -euo pipefail
cd "$(dirname "$0")"

command -v pnpm >/dev/null || npm i -g pnpm
[[ -d node_modules ]] || pnpm install

# Collect Anthropic key + counter/goal and write them into .env (creates it from the example first).
pnpm --filter @pca/backend run configure

# Offer to authorise Yandex Metrika now (writes YANDEX_OAUTH_TOKEN into .env).
read -r -p "Настроить OAuth Яндекс.Метрики сейчас? (y/N): " ans
if [[ "${ans:-}" =~ ^[Yy]$ ]]; then
  pnpm --filter @pca/backend run auth
else
  echo "→ Пропущено. Позже: pnpm auth (или ./run.sh покажет демо-данные без токена)."
fi

echo "✓ Инициализация завершена. Запуск: ./run.sh"
