# Runbook — running & operating

> [🇷🇺 Русский](../runbook.md) · 🇬🇧 English

A detailed "how to run the project" guide, including for a volunteer with no backend experience.

## 1. Requirements

- **Node.js 20 LTS** (`node -v` → v20.x). Install via https://nodejs.org or `nvm install 20`.
- **pnpm 9** — installed automatically by `run.sh`, or manually: `npm i -g pnpm`.
- macOS / Linux. On Windows use WSL2.

## 2. First run (one command)

```bash
cd metrika_analyse_dashboard
./run.sh
```

What `run.sh` does, step by step:

1. Checks Node; installs `pnpm` if missing.
2. `pnpm install` (if `node_modules` is absent).
3. If `.env` is missing — copies it from `.env.example`, asks you to add the token, and exits.
4. Loads `.env`, runs migrations. If `YANDEX_OAUTH_TOKEN` is **not set**, it seeds the DB with
   **demo data** (`pnpm seed`) so the dashboard works right away; if set, it runs a real `sync`.
5. Starts `pnpm dev` (backend + frontend) and opens the browser.

> **Demo mode without a token.** `pnpm seed` (or `pnpm --filter @pca/backend seed`) loads a
> deterministic sample dataset (channels, UTM, geo/device, entry/exit pages, B2B deals, goals).
> Illustrative data, not from Metrika — handy for showing the tool to volunteers before the OAuth token.

## 3. Configuring `.env`

```bash
cp .env.example .env
```

Fill in:

| Variable                                    | Value                                                   |
| ------------------------------------------- | ------------------------------------------------------- |
| `YANDEX_OAUTH_TOKEN`                        | a `metrika:read` token (see README → "Getting a token") |
| `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET` | OAuth app credentials                                   |
| `COUNTER_ID`                                | your Metrika counter (set in `.env`, required for sync) |
| `GOAL_ID`                                   | `0` = auto-detect the KPI goal; `> 0` pins the goal     |
| `PORT` / `API_PORT`                         | `5173` / `4000`                                         |
| `ARCHIVED_GOAL_ID_THRESHOLD`                | `77` (older goals → archived)                           |
| `LOW_UTM_COVERAGE_RATIO`                    | `0.7` (low-UTM-coverage flag threshold)                 |

`.env` is gitignored — the token and secret never reach the repository.

## 4. Verifying it came up

- Frontend: http://localhost:5173 — the "Backend health" card should show `ok`.
- Backend: `curl http://localhost:4000/api/health` → JSON with `status: "ok"`, `counterId`,
  and `metrikaTokenPresent`.

`metrikaTokenPresent: false` means the token has not been added to `.env` yet.

## 5. Common developer commands

```bash
pnpm dev         # backend + frontend in watch mode
pnpm typecheck   # strict type checking
pnpm lint        # ESLint
pnpm test        # Vitest
pnpm coverage    # Vitest with 100% threshold
pnpm e2e         # Playwright
pnpm build       # build (frontend artifact → code/frontend/dist)
```

## 6. Troubleshooting

| Symptom                                  | Cause / fix                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `Node.js 20+ required`                   | install Node 20 (`nvm install 20 && nvm use 20`).                        |
| Browser opened but "Backend unavailable" | backend still starting — refresh in 2–3s; check `API_PORT=4000` is free. |
| `metrikaTokenPresent: false`             | add `YANDEX_OAUTH_TOKEN` to `.env` and restart.                          |
| `EADDRINUSE :4000` / `:5173`             | port busy — change `API_PORT` / `PORT` in `.env`.                        |
| `pnpm: command not found`                | `npm i -g pnpm` (or just run `./run.sh`).                                |

## 7. Stopping

`Ctrl+C` in the terminal running `run.sh` stops backend and frontend.
