#!/usr/bin/env bash
# One-command bootstrap: install → init → start.
set -euo pipefail
cd "$(dirname "$0")"

command -v pnpm >/dev/null || npm i -g pnpm
pnpm install
./init.sh
./run.sh
