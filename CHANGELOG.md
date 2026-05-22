# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/);
проект следует [SemVer](https://semver.org/lang/ru/). Коммиты — Conventional Commits;
релиз публикуется по тегу `v*.*.*` (`.github/workflows/release.yml`).

## [Unreleased]

### Added

- Итерация 12 — **UTM-разбивка** (расширение парсера): новый запрос Stat API `utm-breakdown`
  (`ym:s:UTMSource/UTMMedium/UTMCampaign`), отдельная таблица `utm_stats` (migration 006) с историей
  по дням и репозиторием (`upsertUtmStats`/`listUtmStats`), интеграция в `SyncService.syncUtm` +
  `syncAll` (поле `utmRows` в `SyncSummary`), эндпоинт `GET /api/metrics/utm` и таблица «UTM-разбивка»
  на странице Traffic. Хранится в своей таблице, чтобы не дублировать визиты с `channel_stats`
  (NULL в составном ключе SQLite различимы). Вынесён общий чистый `combineStatus` в `lib/query-status`.
  100% покрытие; e2e проверяет UTM-таблицу.
- Итерация 11 — страница **Funnel** (воронка конверсии «заявка ≠ оплата»): этапы Визиты → Заявки B2C
  (goal reaches) → Билеты B2B (в работе) → Оплачено B2B с поэтапной конверсией и ECharts-воронкой.
  Считается детерминированно на клиенте из уже загруженных данных каналов + B2B (`buildFunnel`,
  `combineStatus`); страница перестала быть заглушкой. 100% покрытие; e2e-навигация на Funnel.
- Итерация 10 — генерация **PDF**: детерминированный print-HTML (`reportHtml`, тот же контент, что и
  DOCX, с экранированием `& < >`), рендер в PDF через `puppeteer-core` (`buildPdf`, без скачивания
  Chromium — нужен локальный Chrome через `PUPPETEER_EXECUTABLE_PATH`). Роут `POST /api/report/generate`
  принимает `format: docx | pdf`, файл пишется как `data/reports/{id}.{format}`; кнопка **Export PDF**
  на странице Report. 100% покрытие (рендерер браузера исключён из coverage как IO); e2e: build → export.
- Итерация 9 — генерация **DOCX**: детерминированный контент отчёта (`reportSections`: cover,
  executive summary, methodology с атрибуцией Воронковой, define/develop гипотезы, deliver/Decision Log,
  data appendix), рендер через `docx` (`buildDocx`), роут `POST /api/report/generate` (формат docx) и
  кнопка **Export DOCX** на странице Report. 100% покрытие; e2e: build snapshot → export. Байт-идентичность
  аппроксимирована детерминизмом контента (zip-таймстемпы — known limitation).
- Итерация 8 — страница **Report Preview**: кнопка «Сформировать snapshot» (`POST /api/report/snapshot`
  за выбранный период) и сводка (KPI заявка/оплата, счётчики каналов/гипотез/решений, период и время
  генерации) — то же, что пойдёт в DOCX/PDF. Пункт Report в навигации. 100% покрытие, e2e.
- Итерация 8 (старт) — отчётность (бэкенд): `SnapshotBuilder` собирает неизменяемый `ReportSnapshot`
  из БД (KPI «заявка ≠ оплата»: b2cApplications vs b2bPaidTickets, gap; каналы за период; гипотезы
  problem/solution; решения) — детерминированно (id + generatedAt на входе). Роуты
  `POST /api/report/snapshot` и `GET /api/report/snapshot/:id`. Тип `ReportSnapshot` в `@pca/shared`.
  100% покрытие. DOCX/PDF и страница Report Preview — следующие итерации.
- Итерация 7 — страница **Decisions** (Decision Log): список карточек DL-{N} (исход-бейдж, ссылка на
  гипотезу) и редактор записи с обязательным выбором гипотезы и доказательной базой (evidence). При
  создании бэкенд атомарно обновляет статус связанной гипотезы; клиент инвалидирует и решения, и
  гипотезы. `api.createDecision`. 100% покрытие, e2e-навигация + блокировка кнопки.
- Итерация 6 (старт) — страница **Hypotheses**: список гипотез по ICE (бейдж приоритета + дней до
  дедлайна) и структурный редактор по Воронковой (subject/action/solution/condition, ≥3 допущения по
  категориям, ≥2 метода, ICE-инпуты с rationale + live-превью, светофор, дедлайн). Сохранение
  заблокировано, пока `validateHypothesis` не пройдёт; `POST /api/hypotheses` (бэкенд тоже валидирует
  → 422). 100% покрытие, e2e-навигация + проверка блокировки кнопки.
- Итерация 5 — страница **B2B**: CRUD-пайплайн (`/api/b2b`) — сводка по этапам, всего и оплачено
  билетов (вклад в KPI 300), форма добавления, смена этапа и удаление (TanStack Query mutations +
  инвалидция). Пункт B2B в навигации. 100% покрытие, e2e-навигация.
- Итерация 5 (старт) — страница **Traffic**: бейдж низкого покрытия UTM (порог 70%),
  таблица по каналам (визиты/пользователи/заявки/CR) и bar-чарт визитов (ECharts), из тех же
  данных `/api/metrics/channels`. Чистый `TrafficView` + data-wrapper, 100% покрытие, e2e-навигация.
- Итерация 4 (старт) — фронтенд-дашборд: app shell (React Router + TanStack Query),
  sticky-фильтры (Zustand: период-пресеты, сегмент, архивные), страница **Overview**
  (KPI «заявка ≠ оплата», графики ECharts «заявки по дням» и «микс каналов»),
  страницы-заглушки Traffic/Funnel/Hypotheses/Decisions. Типизированный API-клиент.
  100% покрытие (Vitest + Testing Library, ECharts замокан), e2e обновлён под новый shell.

## [0.1.0] - 2026-05-22

Первый релиз: рабочий backend (слой данных + Metrika-клиент + REST API) с 100% покрытием,
полный CI/CD-пайплайн и инструмент запуска `./run.sh`. Дашборд-фронтенд — в следующих релизах.

### Added

- Итерация 3 — Backend API: `/api/metrics/*` (channels с фильтром по датам, goals с тоглом
  архивных, raw/:id), `/api/hypotheses` (CRUD; невалидная по Воронковой → 422; patch статуса),
  `/api/decisions` (создание авто-обновляет статус гипотезы; без evidence → 422), `/api/b2b` (CRUD).
  Репозитории инжектятся в Fastify (тестируемо на in-memory SQLite). Swagger на `/docs`.
  109 тестов, 100% покрытие. (Fastify 4 → @fastify/swagger 8 / swagger-ui 2.)
- Итерация 2 — Metrika-клиент: OAuth (`Authorization: OAuth`), token-bucket rate limiter,
  retry с экспоненциальным backoff + jitter, Zod-валидация с дампом ошибок в `data/errors/`,
  pino-логгер с редактированием токена. Запрос traffic-by-source + goals, дневные чанки для
  периодов >7 дней, `SyncService` (raw_responses + channel_stats, история по дням), `POST /api/sync`,
  CLI `pnpm --filter @pca/backend sync` (мягко пропускает без токена). 94 теста, 100% покрытие.
- Итерация 1 — слой данных: SQLite (`better-sqlite3`), миграции 001–005, runner с трекингом,
  repository pattern (metrics/hypotheses/decisions/b2b/snapshot), общие типы и Voronkova-валидация
  в `@pca/shared`. Гипотеза без ≥3 допущений/≥2 методов отклоняется на уровне репозитория;
  создание Decision Log атомарно обновляет статус гипотезы. CLI `pnpm --filter @pca/backend migrate`.
  100% покрытие (56 unit/integration тестов). ADR-002/007 (SQLite, история по дням).
- Итерация 0 — скелет монорепо (`@pca/backend` Fastify `/api/health`, `@pca/frontend`
  React+Vite+Tailwind, `@pca/shared` ICE_CONFIG), TS strict, ESLint/Prettier, `run.sh`, CI.
- Skill-файлы методологии Воронковой в `.claude/skills/` (с атрибуцией) + заполненный `CLAUDE.md`.
- Документация: README, `docs/` (runbook, user-guide, metrika-api-cheatsheet, testing-strategy), ADR 001/006/007.
- Пирамида тестов с порогом покрытия 100% (Vitest unit/integration/component + Playwright e2e).
- GitHub workflows: `ci.yml` (lint/typecheck/coverage/build), `e2e.yml`, `review.yml` (AI code review), `release.yml`.
- Шаблоны PR и Issue (bug, hypothesis), `dependabot.yml`.

[Unreleased]: https://github.com/Fighter90/metrika_analyse_dashboard/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v0.1.0
