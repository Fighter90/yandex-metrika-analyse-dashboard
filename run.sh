#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

command -v node >/dev/null || { echo "Node.js 20+ required"; exit 1; }
command -v pnpm >/dev/null || npm i -g pnpm

[[ -d node_modules ]] || pnpm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ Создан .env. Запусти ./init.sh (Anthropic key + Метрика), затем ./run.sh"
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
  echo "  Запусти ./init.sh для OAuth и реальной выгрузки из Яндекс.Метрики."
  pnpm --filter @pca/backend run --if-present seed
else
  # GOAL_ID (если задан и > 0) включает метрики целей → KPI «заявки».
  GOAL_ARG=""
  if [[ -n "${GOAL_ID:-}" && "${GOAL_ID}" != "0" ]]; then GOAL_ARG="--goalId=${GOAL_ID}"; fi
  pnpm --filter @pca/backend run --if-present sync ${GOAL_ARG}
fi

pnpm dev &
DEV_PID=$!

sleep 3
URL="http://localhost:${PORT:-5173}"
if command -v open >/dev/null; then open "$URL" || true
elif command -v xdg-open >/dev/null; then xdg-open "$URL" || true
fi

wait $DEV_PID
