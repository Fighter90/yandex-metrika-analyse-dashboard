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

> ✅ **Статус: рабочий продукт (релизы v0.1.0–v0.8.0).** Доступно: парсер Метрики (живой OAuth-sync +
> демо-данные), дашборд из 11 страниц (Overview, Traffic, Audience, Behavior, Trends, Funnel, B2B,
> Hypotheses, Decisions, Report, Sources), гипотезы по Воронковой + Decision Log, детерминированные
> DOCX/PDF с опциональным **AI-анализом** (Anthropic), развёртывание одной командой, 100% покрытие
> тестами и полный CI/CD. Проверено на живых данных счётчика `54280963`.

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

Полная диаграмма и слои — в [docs/architecture.md](docs/architecture.md); модель БД —
[docs/data-model.md](docs/data-model.md).

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

## Что делает проект (по логике кода)

Сквозной поток данных, как он реализован в коде:

1. **Аутентификация (OAuth).** `code/backend/src/metrika/oauth.ts` + CLI `cli-auth.ts` (`pnpm auth`)
   реализуют Yandex ID authorization-code flow: строят ссылку авторизации, обменивают код
   подтверждения на токен (`POST https://oauth.yandex.ru/token`) и пишут `YANDEX_OAUTH_TOKEN` в `.env`.
2. **Парсер / ETL.** `SyncService` (`metrika/sync-service.ts`) через `MetrikaClient` (token-bucket
   лимитер, backoff-retry, Zod-валидация ответов) тянет отчёты Stat API **дневными чанками** и для
   каждого среза вызывает запрос-модуль из `metrika/queries/`:
   - `traffic-by-source` → `channel_stats` (визиты/пользователи/отказы/заявки/CR по каналам);
   - `utm-breakdown` → `utm_stats`; `geo-device-breakdown` → `geo_device_stats`;
   - `page-behavior` (startURL) → `page_stats`; `exit-page-behavior` (exitURL) → `exit_page_stats`.
     Каждый **сырой** ответ сохраняется в `raw_responses` (прослеживаемость), затем нормализуется в
     производные таблицы. Проценты Метрики (`bounceRate`, `conversionRate`) нормализуются в долю 0–1
     (`queries/ratio.ts`). Опциональные разбивки синхронятся **best-effort**: недоступный атрибут не
     валит весь пайплайн. Без токена `pnpm seed` кладёт детерминированные демо-данные.
3. **Хранилище.** SQLite (`better-sqlite3`, WAL + FK), миграции `db/migrations/001..009`, доступ
   только через репозитории (`db/repositories/`). История копится **по дням** (повторный sync
   дополняет, не затирая) — отсюда WoW-сравнения и воспроизводимость.
4. **API.** Fastify (`app.ts`) отдаёт `/api/metrics/*`, `/api/hypotheses`, `/api/decisions`,
   `/api/b2b`, `/api/report/*`, `/api/sync`; Swagger на `/docs`. Репозитории инжектятся в
   `buildServer(deps)`.
5. **Дашборд.** React + TanStack Query читает API; страницы — паттерн «чистая View(status,…) + тонкий
   data-wrapper»; графики на ECharts. KPI всюду разделяет **заявку и оплату**.
6. **Отчёт.** `SnapshotBuilder` собирает **неизменяемый** `ReportSnapshot` из БД (детерминированно:
   `id` и `generatedAt` — входные параметры, без `Date.now()`/LLM в render-пути). `reportSections`
   даёт общий контент для DOCX (`docx/builder.ts`) и PDF (`pdf/html.ts` → `pdf/renderer.ts` через
   puppeteer-core). Опциональный **AI-анализ** генерится отдельно из чисел снапшота.

## Виды отчётов и как их строить (end-to-end)

Отчёт строится из **immutable-снапшота** — это гарантирует, что один `snapshotId` всегда даёт один и
тот же контент (anti-hallucination + воспроизводимость).

**Что входит в отчёт** (секции `reportSections`):

- Cover (период, id снапшота, цель), **Executive Summary** (заявки B2C, оплачено B2B, gap — «заявка ≠
  оплата»), **Methodology** (Double Diamond + Воронкова, с атрибуцией);
- **Define — Problem Hypotheses** и **Develop — Solution Hypotheses** (с ICE и дедлайнами);
- **Deliver — Decision Log** (DL-{N} с исходами);
- **Топ-разбивки**: UTM, гео+устройство, страницы входа, страницы выхода (топ-5 по визитам);
- **AI-анализ** (если сгенерирован) — отдельная помеченная секция;
- **Data Appendix** (каналы за период).

**Форматы:** **DOCX** (работает из коробки) и **PDF** (нужен локальный Chrome через
`PUPPETEER_EXECUTABLE_PATH`). Файлы пишутся в `data/reports/{snapshotId}.{docx|pdf}`.

**Шаги (через дашборд, страница Report):**

1. Выберите период в шапке. Нажмите **«Сформировать snapshot»** → `POST /api/report/snapshot` строит
   и сохраняет снапшот, показывает сводку KPI.
2. (Опц.) **«Сгенерировать AI-анализ»** → `POST /api/report/insights` вызывает Anthropic из чисел
   снапшота, сохраняет нарратив в снапшот (помечен как интерпретация). Без `ANTHROPIC_API_KEY` —
   понятное сообщение, отчёт строится без AI-секции.
3. **Export DOCX** / **Export PDF** → `POST /api/report/generate` рендерит файл из снапшота.

**Шаги (через API напрямую):**

```bash
# 1) собрать снапшот за период
SID=$(curl -s -X POST localhost:4000/api/report/snapshot -H 'content-type: application/json' \
  -d '{"from":"2026-05-09","to":"2026-05-22"}' | jq -r .id)
# 2) (опц.) AI-анализ
curl -s -X POST localhost:4000/api/report/insights -H 'content-type: application/json' \
  -d "{\"snapshotId\":\"$SID\"}"
# 3) сгенерировать файл (docx | pdf)
curl -s -X POST localhost:4000/api/report/generate -H 'content-type: application/json' \
  -d "{\"snapshotId\":\"$SID\",\"format\":\"docx\"}"
```

Любое число в отчёте прослеживается до `raw_responses` в SQLite (на дашборде — страница **Sources**
по `raw_response_id`).

## Структура проекта

```
.
├── code/
│   ├── backend/    # Fastify API, Metrika-клиент, SQLite, аналитика, отчёты
│   ├── frontend/   # React + Vite дашборд
│   └── shared/     # общие типы и константы (ICE_CONFIG)
├── .claude/skills/ # 4 skill-промпта Воронковой (с атрибуцией)
├── docs/           # архитектура, модель данных, методология, руководство, runbook, ADR
├── QA/             # промпты для тестирования: регресс + UX (аналитик/проектировщик/дизайнер)
├── data/           # SQLite + отчёты + экспорт DL (gitignored)
├── CLAUDE.md       # контекст продукта для AI-агентов
├── setup.sh        # одна команда: install → init → start
├── init.sh         # интерактивная инициализация .env
└── run.sh          # запуск (миграции → sync/seed → дашборд)
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

Полный набор пайплайнов на каждый push/PR (все зелёные, покрытие 100%):

- **ci.yml** — `lint → format:check → typecheck → coverage (Node 20 + 22) → build` + actionlint + gate;
- **e2e.yml** — Playwright (smoke по всему дашборду);
- **security.yml** — gitleaks + `pnpm audit` (high+);
- **review.yml** — AI code-review (если задан `ANTHROPIC_API_KEY` в секретах репо);
- **pr-lint.yml** — Conventional PR title;
- **release.yml** — по тегу `v*.*.*`: verify → упаковка (app tar.gz + frontend zip + checksums) → GitHub Release.

## Готово (статус по итерациям)

- [x] Скелет, SQLite + миграции, repository pattern, тесты, CI/CD, версионирование.
- [x] Metrika-клиент (OAuth, Zod, rate limiter, retry) + `POST /api/sync`, CLI `pnpm auth`/`sync`/`seed`.
- [x] Backend API (metrics/hypotheses/decisions/b2b/report) + Swagger `/docs`.
- [x] Дашборд: Overview, Traffic, Audience, Behavior, Trends, Funnel, B2B, Hypotheses, Decisions, Report, Sources.
- [x] Гипотезы по Воронковой (формат + валидация + ICE-product) и Decision Log с авто-апдейтом статуса.
- [x] Snapshot + Report Preview + детерминированные DOCX/PDF + опциональный AI-анализ (Anthropic).
- [x] Графики (тултипы с разделителями, значения на барах), пустые состояния, развёртывание одной командой.
- [x] Проверено на живых данных Метрики; security-аудит + ужесточённый `.gitignore`.

### Known limitations

- B2B — ручной ввод (`b2b_manual`), Метрика B2B-пайплайн не покрывает.
- UTM-разметка неравномерная: сегменты с покрытием < 70% помечаются `low_utm_coverage`.
- Цели с `id < ARCHIVED_GOAL_ID_THRESHOLD` (по умолчанию 77) считаются архивными.
- `ym:s:exitURL` не поддерживается Stat API → таблица «Страницы выхода» на живых данных пустая.
- PDF требует локального Chrome (`PUPPETEER_EXECUTABLE_PATH`); DOCX — без зависимостей.

## License · Authors · Credits

- Авторы: команда трека «Конверсии и лидген» ProductCamp.
- Методология (формат гипотез, ICE=product, светофор, Decision Log): **Дарья Воронкова**,
  [Voronik1801 / Podlodka_crew_AI_Product](https://github.com/Voronik1801/Podlodka_crew_AI_Product).
