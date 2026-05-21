# ProductCamp Conversion Analytics Dashboard

> [🇷🇺 Русский](README.md) · 🇬🇧 English

A locally-run analytics tool for ProductCamp's **"Conversions & lead-gen"** track.
It connects to Yandex Metrika (counter `54280963`) over OAuth, caches data in SQLite,
serves an interactive dashboard, and helps run product hypotheses using the Voronkova
methodology (Double Diamond + ICE = I × C × E) with DOCX/PDF report generation.

> **Campaign KPI:** 300+ **paid** tickets. Throughout the tool: **an application ≠ a payment**.

> ⚠️ **Status: Iteration 0 (skeleton).** Working today: the monorepo, backend `/api/health`,
> frontend stub, `./run.sh`, CI, and a 100%-covered test pyramid. Dashboard, hypotheses and
> reports land in later iterations (see [Roadmap](#roadmap)). The docs below describe the
> target workflow and mark what is available now.

## Quickstart

```bash
git clone git@github.com:Fighter90/metrika_analyse_dashboard.git
cd metrika_analyse_dashboard
cp .env.example .env        # then fill in YANDEX_OAUTH_TOKEN (see below)
./run.sh
```

`./run.sh` installs `pnpm` if missing, installs dependencies, (from Iteration 1) runs
migrations, starts backend + frontend, and opens the browser at `http://localhost:5173`.
The backend API runs on `http://localhost:4000` (proxied as `/api`).

Detailed run/troubleshooting: [docs/en/runbook.md](docs/en/runbook.md).
User guide (dashboard, reports): [docs/en/user-guide.md](docs/en/user-guide.md).

## Getting a `YANDEX_OAUTH_TOKEN`

You need a token with the `metrika:read` scope. Yandex ID docs: https://yandex.ru/dev/id/doc/en/.

1. The OAuth app is already registered (its Client ID lives in your local `.env`).
2. Open in a browser (substituting the Client ID):
   `https://oauth.yandex.ru/authorize?response_type=token&client_id=<YANDEX_CLIENT_ID>`
3. Approve access. The token returns in the URL fragment after `#access_token=...`.
4. Paste it into `.env` → `YANDEX_OAUTH_TOKEN=...`.

The token and client secret live **only** in `.env` (gitignored). Never commit them.

## Architecture

```text
Yandex Metrika API ──OAuth──▶ backend (Fastify) ──▶ SQLite (raw_responses → derived tables)
                                     │
                          frontend (React+Vite) ──▶ dashboard + hypothesis editor
                                     │
                          snapshot-builder ──▶ DOCX / PDF (deterministic)
```

## Tech stack

Node 20 · TypeScript 5 strict · Fastify 4 · Zod · undici · better-sqlite3 ·
React 18 + Vite 5 · TailwindCSS + shadcn/ui · Apache ECharts · TanStack Table/Query ·
Zustand · `docx` · Puppeteer · date-fns(-tz) · Vitest + Playwright · ESLint + Prettier · pnpm 9.

Adding a dependency outside this list requires an ADR in `docs/decisions/`.

## Methodology (Double Diamond + Voronkova)

Double Diamond at the top level; the Voronkova methodology inside the Define/Develop phases:

- **Hypothesis format:** "{subject} {action} {solution}, if {condition}".
- **≥3 hidden assumptions** across behavior / market / tech.
- **≥2 validation methods** (synthetic CustDev / live / quantitative / market).
- **ICE = I × C × E (product, 1–1000)** — punishes one-sided hypotheses; see
  `docs/decisions/005-ice-product-vs-mean.md`.
- **Traffic light** (🟢/🟡/🔴) with concrete thresholds + a verification deadline.
- **Decision Log** closes the loop: verification → DL-{N} entry → auto-updates hypothesis status.

Adapted from [**Voronik1801 / Podlodka_crew_AI_Product**](https://github.com/Voronik1801/Podlodka_crew_AI_Product)
(attributed in each `.claude/skills/` file).

## Testing

Full pyramid, **100% coverage threshold** (see [docs/testing-strategy.md](docs/testing-strategy.md)):
unit (Vitest) → integration (`app.inject`, SQLite) → component (Testing Library) → e2e/acceptance (Playwright).

```bash
pnpm test       # quick run
pnpm coverage   # enforces 100% (fails CI on regression)
pnpm e2e        # Playwright (boots frontend, mocks backend)
```

## CLI commands

| Command | Description |
|---|---|
| `pnpm dev` | backend (tsx watch) + frontend (vite) |
| `pnpm build` | build |
| `pnpm typecheck` | type checking |
| `pnpm lint` / `pnpm format` | lint / format |
| `pnpm test` / `pnpm coverage` / `pnpm e2e` | tests |

`sync` / `report` / `new-decision` arrive in Iterations 2/9/7.

## CI/CD

`ci.yml` (install → lint → typecheck → coverage → build) and `e2e.yml` run on every push/PR.
`review.yml` runs AI code review on PRs (needs the `ANTHROPIC_API_KEY` secret). `release.yml`
packages a local-run archive on `v*.*.*` tags. Versioning: SemVer + Conventional Commits + `CHANGELOG.md`.

## Roadmap

- [x] **Iteration 0** — skeleton, skills, CLAUDE.md, run.sh, CI, test pyramid.
- [x] **1** — SQLite + migrations 001–005 + repository pattern + tests.
- [ ] **2** — Metrika client (OAuth, Zod, rate limiter, retry) + `POST /api/sync`.
- [ ] **3** — Backend API (metrics/hypotheses/decisions/b2b) + Swagger.
- [ ] **4–5** — Dashboard: Overview, Traffic, Funnel, Behavior, Forms, B2B.
- [ ] **6** — Hypotheses (Voronkova format, validations, ICE-product, ICEScatter).
- [ ] **7** — Decisions (Decision Log, status auto-update, .md export).
- [ ] **8–10** — Snapshot + Report Preview + DOCX + PDF.
- [ ] **11** — Polish, e2e, docs, ADRs, release.

### Known limitations

- B2B is manual entry (`b2b_manual`); Metrika does not cover the B2B pipeline.
- UTM tagging is uneven: segments with < 70% coverage are flagged `low_utm_coverage`.
- Goals with `id < ARCHIVED_GOAL_ID_THRESHOLD` (default 77) are treated as archived.

## License · Authors · Credits

- Authors: the ProductCamp "Conversions & lead-gen" track team.
- Methodology (hypothesis format, ICE=product, traffic light, Decision Log): **Daria Voronkova**,
  [Voronik1801 / Podlodka_crew_AI_Product](https://github.com/Voronik1801/Podlodka_crew_AI_Product).
