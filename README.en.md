# ProductCamp Conversion Analytics Dashboard

> [🇷🇺 Русский](README.md) · 🇬🇧 English

A locally-run analytics tool for ProductCamp's **"Conversions & lead-gen"** track.
It connects to Yandex Metrika (counter set in `.env`) over OAuth, caches data in SQLite,
serves an interactive dashboard, and helps run product hypotheses using the hypothesis
methodology (Double Diamond + ICE = I × C × E) with DOCX/PDF report generation.

> **Campaign KPI:** 300+ **paid** tickets. Throughout the tool: **an application ≠ a payment**.

> ✅ **Status: working product v2.8.2.** A 9-page dashboard (Overview, Traffic, Behavior, Funnel,
> Goals, Report, History, Settings, Help), mobile hamburger menu, AI analysis in 5 sections with
> a progress bar (HTML rendering), sync with detailed progress (10 stages with descriptions),
> analytical insights on every page (green/yellow/red badges), custom date picker (from/to, max
> 365 days), presets 7d/14d/30d/90d/1y, GOAL_ID select from Metrika, History → "View" opens
> saved snapshots, Settings with current COUNTER_ID display, PDF auto-detect Chrome,
> GOST-formatted DOCX/PDF, full CI/CD.
> **New in v2.7.0:** navigation reduced to 9 pages — Hypotheses, Decisions, and B2B are no longer
> standalone pages; AI-generated hypotheses («Growth Hypotheses (AI)») and AI Decision Log are now
> embedded in the Report (snapshot.generatedHypotheses / snapshot.generatedDecisions); manual B2B
> deal entry moved to a collapsible «B2B Pipeline» section in Settings (/b2b redirects to
> /settings); KPI label reads «Оплат» when the primary goal is a purchase/payment goal
> (formatGoalLabel); centralised channel colour palette across all charts. Verified against live
> data (`<COUNTER_ID>` from `.env`).

## Quickstart

### One command

```bash
git clone git@github.com:Fighter90/metrika_analyse_dashboard.git
cd metrika_analyse_dashboard
./setup.sh          # install → init → start
```

`./setup.sh` runs the three steps below in sequence. To control each step, run them separately:

### Step by step (install → init → start)

```bash
pnpm install        # 1. dependencies
./init.sh           # 2. init: Anthropic key + Metrika params (+ optional OAuth)
./run.sh            # 3. start: migrations → sync (or demo seed without a token) → dashboard
```

**Step 2 — `./init.sh`** interactively creates `.env` (from `.env.example`) and asks for:

- `ANTHROPIC_API_KEY` — key for AI report analysis (optional — the dashboard works without it);
- `COUNTER_ID` — your Yandex Metrika counter (required for a live sync; set in `.env`);
- `GOAL_ID` — the KPI goal id; `0` (default) = **auto-detect** the primary payment/purchase goal from
  the counter's goals, any value `> 0` pins the goal explicitly;
- and offers to set up **Yandex Metrika OAuth** right away (`pnpm auth`).

**Step 3 — `./run.sh`** installs `pnpm` if missing, runs migrations, then: with a
`YANDEX_OAUTH_TOKEN` it pulls live data (`pnpm sync`; with `GOAL_ID=0` the goal is auto-detected,
otherwise `--goalId=$GOAL_ID` is passed), otherwise it seeds the
dashboard with **demo data** (`pnpm seed`), starts backend + frontend and opens
`http://localhost:5173` (API on `http://localhost:4000`, proxied as `/api`).

> Without a token and without an AI key it still runs in demo mode — handy for an instant demo.

Detailed run/troubleshooting: [docs/en/runbook.md](docs/en/runbook.md).
User guide (dashboard, reports): [docs/en/user-guide.md](docs/en/user-guide.md).
Full dashboard help: on the **Help** page (`http://localhost:5173/help`).

## Getting a `YANDEX_OAUTH_TOKEN`

You need a token with the `metrika:read` scope. Yandex ID docs: https://yandex.ru/dev/id/doc/en/.

### Option 1 (recommended) — the built-in `pnpm auth` helper

Implements the authorization-code flow (uses the Client ID + Client secret from `.env`):

```bash
pnpm auth        # from the repo root
```

1. The helper prints an authorize URL (`response_type=code`). Open it and approve access.
2. Copy the **confirmation code** from Yandex and paste it back into the terminal.
3. The helper exchanges the code for a token (`POST https://oauth.yandex.ru/token`) and **writes**
   `YANDEX_OAUTH_TOKEN` into `.env` itself. Then run `pnpm sync`.

### Option 2 (manual) — implicit flow

1. Open in a browser (substituting the Client ID):
   `https://oauth.yandex.ru/authorize?response_type=token&client_id=<YANDEX_CLIENT_ID>`
2. Approve access. The token returns in the URL fragment after `#access_token=...`.
3. Paste it into `.env` → `YANDEX_OAUTH_TOKEN=...`.

The token and client secret live **only** in `.env` (gitignored). Never commit them.

## Architecture

```text
Yandex Metrika API ──OAuth──▶ backend (Fastify) ──▶ SQLite (raw_responses → derived tables)
                                     │
                          frontend (React+Vite) ──▶ dashboard + hypothesis editor
                                     │
                          snapshot-builder ──▶ DOCX / PDF (deterministic) + optional AI analysis
```

Full diagram and layers: [docs/architecture.md](docs/architecture.md); data model:
[docs/data-model.md](docs/data-model.md).

## Tech stack

Node 20 · TypeScript 5 strict · Fastify 4 · Zod · undici · better-sqlite3 ·
React 18 + Vite 5 · TailwindCSS · Apache ECharts · TanStack Table/Query ·
Zustand · `docx` · puppeteer-core · date-fns(-tz) · Vitest + Playwright · ESLint + Prettier · pnpm 9.

Adding a dependency outside this list requires an ADR in `docs/decisions/`.

## Methodology (Double Diamond)

Double Diamond at the top level; the hypothesis methodology inside the Define/Develop phases:

- **Hypothesis format:** "{subject} {action} {solution}, if {condition}".
- **≥3 hidden assumptions** across behavior / market / tech.
- **≥2 validation methods** (synthetic CustDev / live / quantitative / market).
- **ICE = I × C × E (product, 1–1000)** — punishes one-sided hypotheses; see
  `docs/decisions/005-ice-product-vs-mean.md`.
- **Traffic light** (🟢/🟡/🔴) with concrete thresholds + a verification deadline.
- **Decision Log** closes the loop: verification → DL-{N} entry → auto-updates hypothesis status.

Full methodology description: `docs/methodology-hypotheses.md`.

## What the project does (by code logic)

The end-to-end data flow as implemented:

1. **Auth (OAuth).** `code/backend/src/metrika/oauth.ts` + the `cli-auth.ts` CLI (`pnpm auth`)
   implement the Yandex ID authorization-code flow: build the authorize URL, exchange the
   confirmation code for a token (`POST https://oauth.yandex.ru/token`), write `YANDEX_OAUTH_TOKEN`.
2. **Parser / ETL.** `SyncService` (`metrika/sync-service.ts`), via `MetrikaClient` (token-bucket
   limiter, backoff retry, Zod validation), pulls Stat API reports in **daily chunks** and runs a
   query module from `metrika/queries/` for each cut:
   - `traffic-by-source` → `channel_stats`; `utm-breakdown` → `utm_stats`;
   - `geo-device-breakdown` → `geo_device_stats`;
   - `page-behavior` (startURL) → `page_stats`; `exit-page-behavior` (exitURL) → `exit_page_stats`.
     Every **raw** response is stored in `raw_responses` (traceability), then normalised into derived
     tables. Metrika percentages (`bounceRate`, `conversionRate`) are normalised to 0–1 ratios
     (`queries/ratio.ts`). Optional breakdowns sync **best-effort**: an unavailable attribute doesn't
     abort the pipeline. Without a token, `pnpm seed` loads deterministic demo data.
3. **Storage.** SQLite (`better-sqlite3`, WAL + FK), migrations `db/migrations/001..009`, access only
   via repositories (`db/repositories/`). History accumulates **per day** (a repeated sync appends,
   never overwrites) — enabling WoW comparisons and reproducibility.
4. **API.** Fastify (`app.ts`) serves `/api/metrics/*`, `/api/hypotheses`, `/api/decisions`,
   `/api/b2b`, `/api/report/*`, `/api/sync`, `/api/settings`; Swagger at `/docs`.
5. **Dashboard.** React + TanStack Query reads the API; each page is a pure `View(status, …)` + a thin
   data wrapper; charts use ECharts. KPIs keep **application ≠ payment** everywhere.
   - **Segment filter** (B2C / B2C+B2B / B2B): filters channels and UTM on all pages.
   - **📅 Pick dates**: custom date picker (from/to).
   - **🔄 Rebuild report**: button on the Report page — rebuilds the snapshot with current filters.
   - **Archived goals**: checkbox toggles archived Metrika goals.
   - **Mobile menu**: hamburger on screens < 1024px.
   - **Analytical insights**: on every page — colored badges (🟢 good, 🔴 problem).
6. **Report.** `SnapshotBuilder` assembles an **immutable** `ReportSnapshot` from the DB
   (deterministic: `id` and `generatedAt` are inputs, no `Date.now()`/LLM in the render path).
   `reportSections` feeds both DOCX (`docx/builder.ts`) and PDF (`pdf/html.ts` →
   `pdf/renderer.ts` via puppeteer-core). The **AI analysis** is generated in 5 chunks (with a
   per-section timeout), rendered as HTML (tables, headers, formatting).

## Dashboard Pages

| Page         | URL         | Description                                                                                                                                                                             |
| ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Overview** | `/`         | KPI strip («Оплат» label for purchase goals); weekly digest card (visits + applications WoW delta, top channel, top weak spot); daily charts; channel mix; UTM breakdown; weak spots    |
| **Traffic**  | `/traffic`  | Channel bar chart; visits vs applications; channel table with CR; UTM-Sankey (source → campaign → applications); insights; chart captions                                               |
| **Behavior** | `/behavior` | Entry page CR; entry/exit bounce rates; color-highlighted tables; recommendations; chart captions                                                                                       |
| **Funnel**   | `/funnel`   | 4 stages (Visits → B2C Applications → B2B Pipeline → B2B Paid); loss analysis; funnel by channel; CR by channel; B2B by stage; chart captions                                           |
| **Goals**    | `/goals`    | Progress ring to 300 tickets; metrics; B2B deals; data-driven recommendations                                                                                                           |
| **Report**   | `/report`   | Snapshot generation; AI-generated hypotheses and AI Decision Log embedded in report; AI analysis (5 sections, HTML rendering); DOCX/PDF export; rebuild                                 |
| **History**  | `/history`  | Snapshot list (horizontally scrollable); "View" button → opens saved report                                                                                                             |
| **Settings** | `/settings` | OAuth token, Client ID/Secret, COUNTER_ID, GOAL_ID, ANTHROPIC_API_KEY; sync with progress bar (10 stages); current counter display; collapsible «B2B Pipeline» section for manual entry |
| **Help**     | `/help`     | Full documentation: all pages described, filters, FAQ (10 questions), glossary                                                                                                          |

> Stale URLs `/hypotheses`, `/decisions`, and `/b2b` redirect to `/report` or `/settings` respectively.

## Filters (dashboard header)

- **7d / 14d / 30d / 90d / 1y** — quick period presets
- **📅 Dates** — custom period (start date → end date → Apply, max 365 days)
- **Segment**: B2C / B2C+B2B / B2B (filters channels and UTM)
- **Archived goals** — show/hide archived Metrika goals

## Report types and how to build them (end-to-end)

A report is built from an **immutable snapshot** — so the same `snapshotId` always yields the same
content (anti-hallucination + reproducibility).

**What the report contains** (`reportSections`):

- Cover (period, snapshot ID, target), Executive Summary (B2C applications, B2B paid, gap —
  "application ≠ payment"), Methodology (Double Diamond + hypothesis methodology);
- **Define — Problem Hypotheses** and **Develop — Solution Hypotheses** (with ICE and deadlines);
- **Deliver — Decision Log** (DL-{N} with outcomes);
- **Top breakdowns**: UTM, geo+device, entry pages, exit pages (top 5 by visits);
- **AI analysis** (5 sections: Summary, Channels/UTM/Audience, Pages/Funnel, Risks/Recommendations,
  Hypotheses/Roadmap) — rendered as HTML with formatting;
- **Data Appendix** (channels for the period).

**Formats:** **DOCX** (works out of the box) and **PDF** (needs a local Chrome via
`PUPPETEER_EXECUTABLE_PATH`). Files are written to `data/reports/{snapshotId}.{docx|pdf}`.

**Via the dashboard (Report page):**

1. Pick the period in the header. Click **"Build snapshot"** → `POST /api/report/snapshot` builds and
   stores the snapshot and shows the KPI summary.
2. (Optional) **"Generate AI analysis"** → `POST /api/report/insights` calls Anthropic from the
   snapshot numbers (5 sections, ~30–60s). Without `ANTHROPIC_API_KEY` it shows a clear message and
   the report is built without the AI section.
3. **"Rebuild report"** — refresh the snapshot with current filters.
4. **Export DOCX** / **Export PDF** → `POST /api/report/generate` renders the file from the snapshot.

**Via the API directly:**

```bash
# 1) build a snapshot for a period
SID=$(curl -s -X POST localhost:4000/api/report/snapshot -H 'content-type: application/json' \
  -d '{"from":"2026-05-09","to":"2026-05-22"}' | jq -r .id)
# 2) (optional) AI analysis
curl -s -X POST localhost:4000/api/report/insights -H 'content-type: application/json' \
  -d "{\"snapshotId\":\"$SID\"}"
# 3) render a file (docx | pdf)
curl -s -X POST localhost:4000/api/report/generate -H 'content-type: application/json' \
  -d "{\"snapshotId\":\"$SID\",\"format\":\"docx\"}"
```

Every number in the report traces back to `raw_responses` in SQLite (traceability invariant).

## CLI commands

| Command                                         | Description                                             |
| ----------------------------------------------- | ------------------------------------------------------- |
| `./setup.sh`                                    | everything in one command: install → init → start       |
| `./init.sh`                                     | init `.env` (Anthropic key, COUNTER_ID, GOAL_ID, OAuth) |
| `./run.sh`                                      | start: migrations → sync/seed → dashboard               |
| `pnpm install`                                  | install dependencies                                    |
| `pnpm auth`                                     | Yandex Metrika OAuth → `YANDEX_OAUTH_TOKEN` in `.env`   |
| `pnpm seed`                                     | seed the DB with demo data (no token)                   |
| `pnpm --filter @pca/backend sync --goalId=<id>` | live pull from Metrika for a period                     |
| `pnpm dev`                                      | backend (tsx watch) + frontend (vite)                   |
| `pnpm build` / `pnpm typecheck`                 | build / type checking                                   |
| `pnpm lint` / `pnpm format`                     | lint / format                                           |
| `pnpm test` / `pnpm coverage`                   | vitest (397 tests passing)                              |

## Spec-Driven Development

Non-trivial features (touching > 1 file or > ~30 min; changing data, API, methodology or KPI math) go
through a **spec** before code: `docs/specs/NNN-*.md` from the [`docs/specs/TEMPLATE.md`](docs/specs/TEMPLATE.md)
template. The cycle is **spec → review → plan → tests → impl**: first capture _what_ and _why_ with
measurable acceptance criteria, then write failing tests (TDD red→green→refactor), then implement; every
PR references its spec. Process and registry: [`docs/specs/README.md`](docs/specs/README.md). Small
changes (typos, cleanup, docs) need no spec.

## CI/CD

A full set of pipelines on every push/PR:

- **ci.yml** — `lint → format:check → typecheck → coverage (Node 20 + 22) → build` + actionlint + gate;
- **e2e.yml** — Playwright (dashboard smoke);
- **security.yml** — gitleaks + `pnpm audit` (high+);
- **review.yml** — AI code review (when `ANTHROPIC_API_KEY` repo secret is set);
- **pr-lint.yml** — Conventional PR title;
- **release.yml** — on a `v*.*.*` tag: verify → package (app tar.gz + frontend zip + checksums) → GitHub Release.

Versioning: SemVer + Conventional Commits + `CHANGELOG.md`.

## Done (status by iteration)

- [x] Skeleton, SQLite + migrations, repository pattern, tests, CI/CD, versioning.
- [x] Metrika client (OAuth, Zod, rate limiter, retry) + `POST /api/sync`, CLIs `pnpm auth`/`sync`/`seed`.
- [x] Backend API (metrics/hypotheses/decisions/b2b/report/settings) + Swagger `/docs`.
- [x] Dashboard: 9 pages (Overview, Traffic, Behavior, Funnel, Goals, Report, History, Settings, Help).
- [x] AI-generated hypotheses and Decision Log embedded in the report (snapshot.generatedHypotheses / snapshot.generatedDecisions); manual B2B pipeline in Settings.
- [x] Snapshot + Report Preview + deterministic DOCX/PDF + AI analysis (5 sections, HTML rendering).
- [x] Mobile menu (hamburger), custom date picker, segment filter (B2C/B2C+B2B/B2B).
- [x] Analytical insights on every page (color badges), History → "View".
- [x] Settings: sync progress bar (10 stages), current COUNTER_ID display.
- [x] Help page: full documentation (9 sections, 10 FAQ, glossary).
- [x] 397 tests passing (shared: 54, backend: 222, frontend: 121).
- [x] Verified against live Metrika data (counter `<COUNTER_ID>` from `.env`); security audit + `.gitignore`.

### Known limitations

- B2B is manual entry (`b2b_manual`); Metrika does not cover the B2B pipeline.
- UTM tagging is uneven: segments with < 70% coverage are flagged `low_utm_coverage`.
- Goals with `id < ARCHIVED_GOAL_ID_THRESHOLD` (default 77) are treated as archived.
- `ym:s:exitURL` is not supported by the Stat API → the "Exit pages" table is empty on live data.
- PDF needs a local Chrome (`PUPPETEER_EXECUTABLE_PATH`); DOCX needs nothing extra.

## Releases

| Version                                                                              | Date       | Description                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v2.8.2** (Latest)                                                                  | 2026-05-28 | Browser E2E audit: fixed duplicate React keys (Overview/Funnel), favicon; refreshed docs + full regression prompt; scrubbed the live COUNTER_ID from the repo               |
| [v2.8.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.1) | 2026-05-28 | WCAG AA accessibility: text contrast ≥4.5:1, keyboard-accessible tables — 0 axe violations across 9 pages                                                                   |
| [v2.8.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.0) | 2026-05-28 | Chart images in DOCX/PDF (bar/funnel/mix) + per-chart 🟢/🔴 block (spec 014); mobile filter bottom-sheet; B2B kanban+drawer; sync-versions + pre-commit hook                |
| [v2.7.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.7.1) | 2026-05-27 | Sync uses filter period, bar-chart axes, formatGoalLabel in report/Goals, visits invariant test, mobile e2e, report 🟢/🔴 block; full Metrika reconciliation (0 mismatches) |
| [v2.7.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.7.0) | 2026-05-27 | Navigation → 9 pages; AI hypotheses + AI Decision Log in report; B2B pipeline in Settings; formatGoalLabel; centralised channel palette                                     |
| [v2.6.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.6.0) | 2026-05-27 | Chart captions, weekly digest, UTM-Sankey, visit undercount fix (matches Metrika), safe re-sync, mobile-polish                                                              |
| [v2.5.7](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.5.7) | 2026-05-27 | Build/gate hotfix (TS in DOCX/frontend) + version sync, 100% coverage                                                                                                       |
| [v2.4.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.4.1) | 2026-05-27 | Docs and architecture pass, aligned to the 9-page dashboard                                                                                                                 |
| [v2.3.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.3.0) | 2026-05-27 | AI narrative full rendering, md-to-html tables/lists, DOCX/PDF GOST                                                                                                         |
| [v2.2.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.2.1) | 2026-05-27 | Goals Page NaN Fix                                                                                                                                                          |
| [v2.2.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.2.0) | 2026-05-27 | Gap Fix, History AI Narrative, DOCX/PDF GOST Formatting                                                                                                                     |
| [v2.1.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.1.0) | 2026-05-27 | Extended filters (up to 1 year), GOAL_ID select, PDF auto-detect, user guide                                                                                                |
| [v2.0.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.0.0) | 2026-05-26 | Full Dashboard Overhaul (9 pages, AI HTML, mobile menu, Help page)                                                                                                          |

## License · Authors · Credits

- Authors: the ProductCamp "Conversions & lead-gen" track team.
