# ProductCamp Conversion Analytics Dashboard

[![CI](https://github.com/Fighter90/metrika_analyse_dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/Fighter90/metrika_analyse_dashboard/actions/workflows/ci.yml)
[![E2E](https://github.com/Fighter90/metrika_analyse_dashboard/actions/workflows/e2e.yml/badge.svg)](https://github.com/Fighter90/metrika_analyse_dashboard/actions/workflows/e2e.yml)
[![Security](https://github.com/Fighter90/metrika_analyse_dashboard/actions/workflows/security.yml/badge.svg)](https://github.com/Fighter90/metrika_analyse_dashboard/actions/workflows/security.yml)

> 🇷🇺 Русский · [🇬🇧 English](README.en.md)

Локально запускаемый аналитический инструмент для трека **«Конверсии и лидген» ProductCamp**.
Подключается по OAuth к Яндекс.Метрике (счётчик `54280963`), кэширует данные в SQLite,
поднимает интерактивный дашборд и помогает вести продуктовые гипотезы по методологии
Воронковой (Double Diamond + ICE = I × C × E) с генерацией DOCX/PDF-отчётов.

> **KPI кампании:** 300+ **платных** билетов. Везде в инструменте: **заявка ≠ оплата**.

> ✅ **Статус: рабочий продукт.** Доступно: парсер Метрики (живой OAuth-sync + демо-данные),
> дашборд из 11 страниц (Overview, Traffic, Audience, Behavior, Trends, Funnel, B2B, Hypotheses,
> Decisions, Report, Sources), гипотезы по Воронковой + Decision Log, детерминированные DOCX/PDF
> с опциональным **AI-анализом** (Anthropic), 100% покрытие тестами и полный CI/CD. Релизы
> v0.1.0–v0.5.0.

## Скриншоты

_Появятся по мере готовности страниц: Overview, Hypotheses, Decisions, Report Preview._

## Quickstart

### Одной командой

```bash
git clone git@github.com:Fighter90/metrika_analyse_dashboard.git
cd metrika_analyse_dashboard
./setup.sh          # install → init → start
```

`./setup.sh` последовательно делает три шага ниже. Если хотите контроль на каждом шаге —
выполняйте их по отдельности:

### По шагам (install → init → start)

```bash
pnpm install        # 1. зависимости
./init.sh           # 2. инициализация: Anthropic key + параметры Метрики (+ опц. OAuth)
./run.sh            # 3. запуск: миграции → sync (или демо-seed без токена) → дашборд
```

**Шаг 2 — `./init.sh`** интерактивно создаёт `.env` (из `.env.example`) и спрашивает:

- `ANTHROPIC_API_KEY` — ключ для AI-анализа отчётов (можно пропустить — дашборд работает без него);
- `COUNTER_ID` — счётчик Яндекс.Метрики (по умолчанию `54280963`);
- `GOAL_ID` — id цели «заявка» для KPI (`0` = без цели);
- предложит сразу настроить **OAuth Яндекс.Метрики** (`pnpm auth`).

**Шаг 3 — `./run.sh`** ставит `pnpm` при отсутствии, прогоняет миграции, затем: при наличии
`YANDEX_OAUTH_TOKEN` тянет живые данные (`pnpm sync --goalId=$GOAL_ID`), иначе наполняет дашборд
**демо-данными** (`pnpm seed`), поднимает backend + frontend и открывает
`http://localhost:5173` (API — `http://localhost:4000`, проксируется как `/api`).

> Без токена и без AI-ключа всё равно запустится в демо-режиме — удобно показать инструмент сразу.

Подробный разбор запуска и устранение проблем — в [docs/runbook.md](docs/runbook.md).
Руководство пользователя (дашборд, отчёты) — в [docs/user-guide.md](docs/user-guide.md).

## Как получить `YANDEX_OAUTH_TOKEN`

Нужен токен со scope `metrika:read`. Документация Яндекс ID: https://yandex.ru/dev/id/doc/ru/.

### Способ 1 (рекомендуется) — встроенный помощник `pnpm auth`

Реализует authorization-code flow (использует ClientID + Client secret из `.env`):

```bash
pnpm auth        # из корня репозитория
```

1. Помощник печатает ссылку авторизации (`response_type=code`). Откройте её в браузере и подтвердите доступ.
2. Скопируйте **код подтверждения** со страницы Яндекса и вставьте обратно в терминал.
3. Помощник обменяет код на токен (`POST https://oauth.yandex.ru/token`) и **сам впишет**
   `YANDEX_OAUTH_TOKEN` в `.env`. Дальше: `pnpm sync`.

### Способ 2 (вручную) — implicit flow

1. Откройте в браузере (подставив ClientID):
   `https://oauth.yandex.ru/authorize?response_type=token&client_id=<YANDEX_CLIENT_ID>`
2. Подтвердите доступ. Токен вернётся в адресной строке после `#access_token=...`.
3. Скопируйте его в `.env` → `YANDEX_OAUTH_TOKEN=...`.

Токен и client secret хранятся **только** в `.env` (он в `.gitignore`). Никогда не коммитьте их.

## Архитектура

```
Яндекс.Метрика API ──OAuth──▶ backend (Fastify) ──▶ SQLite (raw_responses → производные таблицы)
                                     │
                          frontend (React+Vite) ──▶ дашборд + редактор гипотез
                                     │
                          snapshot-builder ──▶ DOCX / PDF (детерминированно)
```

Полная диаграмма (mermaid) — в [docs/architecture.md](docs/architecture.md) _(добавляется в итерации 11)_.

## Технологический стек

Node 20 · TypeScript 5 strict · Fastify 4 · Zod · undici · better-sqlite3 ·
React 18 + Vite 5 · TailwindCSS + shadcn/ui · Apache ECharts · TanStack Table/Query ·
Zustand · `docx` · Puppeteer · date-fns(-tz) · Vitest + Playwright · ESLint + Prettier · pnpm 9.

Добавление зависимостей вне списка требует ADR в `docs/decisions/`.

## Методология (Double Diamond + Воронкова)

Верхний уровень процесса — **Double Diamond**; внутри фаз Define/Develop — методология
Воронковой:

- **Формат гипотезы:** «{subject} {action} {solution}, если {condition}».
- **≥3 скрытых допущения** в категориях behavior / market / tech.
- **≥2 способа проверки** (synthetic CustDev / live / quantitative / market).
- **ICE = I × C × E (product, 1–1000)** — наказывает однобокие гипотезы; см.
  `docs/decisions/005-ice-product-vs-mean.md`.
- **Светофор** (🟢/🟡/🔴) с конкретными порогами + дедлайн проверки.
- **Decision Log** замыкает цикл: проверка → запись DL-{N} → авто-обновление статуса гипотезы.

Методология адаптирована из
[**Voronik1801 / Podlodka_crew_AI_Product**](https://github.com/Voronik1801/Podlodka_crew_AI_Product)
(с атрибуцией в каждом файле `.claude/skills/`).

## Структура проекта

```
.
├── code/
│   ├── backend/    # Fastify API, Metrika-клиент, SQLite, аналитика, отчёты
│   ├── frontend/   # React + Vite дашборд
│   └── shared/     # общие типы и константы (ICE_CONFIG)
├── .claude/skills/ # 4 skill-промпта Воронковой (с атрибуцией)
├── docs/           # архитектура, методология, руководство пользователя, ADR
├── data/           # SQLite + отчёты + экспорт DL (gitignored)
├── CLAUDE.md       # контекст продукта для AI-агентов
└── run.sh          # запуск одной командой
```

## CLI-команды

| Команда                                         | Описание                                                       |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `./setup.sh`                                    | всё одной командой: install → init → start                     |
| `./init.sh`                                     | инициализация .env (Anthropic key, COUNTER_ID, GOAL_ID, OAuth) |
| `./run.sh`                                      | запуск: миграции → sync/seed → дашборд                         |
| `pnpm install`                                  | установка зависимостей                                         |
| `pnpm auth`                                     | OAuth Яндекс.Метрики → `YANDEX_OAUTH_TOKEN` в .env             |
| `pnpm seed`                                     | наполнить БД демо-данными (без токена)                         |
| `pnpm --filter @pca/backend sync --goalId=<id>` | живая выгрузка из Метрики за период                            |
| `pnpm dev`                                      | backend (tsx watch) + frontend (vite)                          |
| `pnpm build` / `pnpm typecheck`                 | сборка / проверка типов                                        |
| `pnpm lint` / `pnpm format`                     | линт / форматирование                                          |
| `pnpm test` / `pnpm coverage`                   | vitest (порог покрытия 100%)                                   |

## CI/CD

`.github/workflows/ci.yml` на каждый push/PR: `install → lint → typecheck → test → build`
и заливает артефакт сборки frontend. `e2e.yml` и `release.yml` — в итерации 11.

## Roadmap

- [x] **Итерация 0** — скелет, skill-файлы, CLAUDE.md, run.sh, CI.
- [x] **1** — SQLite + миграции 001–005 + repository pattern + тесты.
- [x] **2** — Metrika-клиент (OAuth, Zod, rate limiter, retry) + `POST /api/sync`.
- [x] **3** — Backend API (metrics/hypotheses/decisions/b2b) + Swagger.
- [ ] **4–5** — Дашборд: Overview, Traffic, Funnel, Behavior, Forms, B2B.
- [ ] **6** — Hypotheses (формат Воронковой, валидации, ICE-product, ICEScatter).
- [ ] **7** — Decisions (Decision Log, авто-апдейт статуса, экспорт .md).
- [ ] **8–10** — Snapshot + Report Preview + DOCX + PDF.
- [ ] **11** — Polish, e2e, docs, ADR, release.

### Known limitations

- B2B — ручной ввод (`b2b_manual`), Метрика B2B-пайплайн не покрывает.
- UTM-разметка неравномерная: сегменты с покрытием < 70% помечаются `low_utm_coverage`.
- Цели с `id < ARCHIVED_GOAL_ID_THRESHOLD` (по умолчанию 77) считаются архивными.

## License · Authors · Credits

- Авторы: команда трека «Конверсии и лидген» ProductCamp.
- Методология (формат гипотез, ICE=product, светофор, Decision Log): **Дарья Воронкова**,
  [Voronik1801 / Podlodka_crew_AI_Product](https://github.com/Voronik1801/Podlodka_crew_AI_Product).
