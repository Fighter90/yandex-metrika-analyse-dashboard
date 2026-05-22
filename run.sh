#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "Node.js 20+ required"; exit 1; }
command -v pnpm >/dev/null || npm i -g pnpm

[[ -d node_modules ]] || pnpm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ Заполни YANDEX_OAUTH_TOKEN в .env и запусти снова"
  exit 1
fi

# Load .env so we know which port to open in the browser.
set -a
# shellcheck disable=SC1091
source .env
set +a

# Apply migrations, then populate data. With a real OAuth token we sync from Metrika; without one
# we seed deterministic demo data so the dashboard is usable immediately (--if-present stays safe).
pnpm --filter @pca/backend run --if-present migrate
if [[ -z "${YANDEX_OAUTH_TOKEN:-}" || "${YANDEX_OAUTH_TOKEN}" == "YOUR_OAUTH_TOKEN_HERE" ]]; then
  echo "→ YANDEX_OAUTH_TOKEN не задан — наполняю дашборд демо-данными (pnpm seed)."
  echo "  Укажи токен в .env для реальной выгрузки из Яндекс.Метрики."
  pnpm --filter @pca/backend run --if-present seed
else
  pnpm --filter @pca/backend run --if-present sync
fi

pnpm dev &
DEV_PID=$!

sleep 3
URL="http://localhost:${PORT:-5173}"
if command -v open >/dev/null; then open "$URL" || true
elif command -v xdg-open >/dev/null; then xdg-open "$URL" || true
fi

wait $DEV_PID
