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

# Iteration 1+ will add these scripts; --if-present keeps the skeleton runnable today.
pnpm --filter @pca/backend run --if-present migrate
pnpm --filter @pca/backend run --if-present sync

pnpm dev &
DEV_PID=$!

sleep 3
URL="http://localhost:${PORT:-5173}"
if command -v open >/dev/null; then open "$URL" || true
elif command -v xdg-open >/dev/null; then xdg-open "$URL" || true
fi

wait $DEV_PID
