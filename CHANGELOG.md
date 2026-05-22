# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/);
проект следует [SemVer](https://semver.org/lang/ru/). Коммиты — Conventional Commits;
релиз публикуется по тегу `v*.*.*` (`.github/workflows/release.yml`).

## [Unreleased]

### Added

- Итерация 29 — **AI-анализ на странице Report (UI)**: кнопка «Сгенерировать AI-анализ» вызывает
  `POST /api/report/insights`, показывает нарратив с пометкой «интерпретация поверх точных цифр»,
  состояния pending/ошибка (без ключа — понятное сообщение). Клиент `api.generateInsights`, чистый
  хелпер `errorMessage`. 100% покрытие; e2e генерит AI-анализ на странице Report.

- Итерация 28 — **развёртывание одной командой** (install → init → start): `./setup.sh` делает всё;
  `./init.sh` интерактивно создаёт `.env` и собирает Anthropic key + `COUNTER_ID` + `GOAL_ID`
  (+ опц. OAuth через `pnpm auth`). Чистый `setup/init-env.ts` (`applyInitValues`, переиспользует
  `upsertEnvVar`) — 100% покрытие; CLI `cli-init.ts` (`pnpm --filter @pca/backend configure`) исключён
  как интерактивный IO. `run.sh` теперь использует `GOAL_ID` для sync (KPI «заявки»). README:
  подробный раздел развёртывания + таблица CLI-команд.

- Итерация 27 — **AI-анализ отчёта (Anthropic Claude), backend**: модуль `report/ai-insights.ts`
  (`buildInsightsRequest`/`parseInsights`/`generateInsights`) строит запрос из чисел снапшота с
  anti-hallucination system-промптом и парсит ответ Anthropic Messages API; эндпоинт
  `POST /api/report/insights` генерит нарратив, сохраняет его в снапшот (`aiNarrative`) и возвращает.
  DOCX/PDF печатают отдельную секцию «AI-анализ» **только из сохранённого текста** — render-путь
  остаётся детерминированным (LLM вызывается при генерации, не при рендере). Конфиг: `ANTHROPIC_API_KEY`,
  `ANTHROPIC_MODEL` (по умолчанию `claude-sonnet-4-6`), `GOAL_ID`. Без ключа фича отдаёт 503 с понятным
  сообщением, дашборд работает. 100% покрытие (HTTP-вызов исключён как IO).

- Итерация 26 — **больше графиков для наглядности**: на странице **Audience** добавлены горизонтальный
  бар «Топ стран по визитам» и донат «Доля устройств»; на странице **Behavior** — бары «Топ страниц
  входа/выхода» (визиты + заявки), URL сокращаются до пути. Чистые билдеры опций (`audienceBarOption`,
  `deviceShareOption`, `pageBarOption`) — 100% покрытие. Раньше эти страницы были только таблицами.
- Итерация 25.x — фиксы по живым данным Метрики (см. PR #35–#37): корректный путь к `.env` в
  `pnpm auth`; устойчивый sync (битый атрибут не валит пайплайн; `ym:s:exitURL` недоступен в API —
  страницы выхода пустые); нормализация `bounceRate`/`conversionRate` из процентов в долю 0–1.

- Итерация 25 — **получение OAuth-токена в приложении** (`pnpm auth`): Yandex ID authorization-code
  flow. Чистый модуль `metrika/oauth.ts` (`authorizeUrl`, `exchangeCodeForToken` через `POST
/token`, `upsertEnvVar`) + интерактивный CLI `cli-auth`: печатает ссылку авторизации, принимает код
  подтверждения, обменивает его на токен (ClientID + Client secret из `.env`) и вписывает
  `YANDEX_OAUTH_TOKEN` в `.env`. Секрет/токен не логируются. 100% покрытие пуре-модуля (CLI исключён).
  README: обновлён раздел «Как получить токен».
- Итерация 24 — **демо-данные** (`pnpm seed`): детерминированный генератор `buildSeedData`
  (каналы, UTM, гео/девайс, страницы входа/выхода, B2B-сделки, цели) + CLI `cli-seed` наполняет SQLite.
  `./run.sh` теперь при отсутствии `YANDEX_OAUTH_TOKEN` автоматически сидит демо-данные, и дашборд
  сразу рабочий (без OAuth) — удобно для онбординга волонтёров. Числа иллюстративные, не из Метрики;
  «заявка ≠ оплата» сохранён (одна оплаченная B2B-сделка). 100% покрытие пуре-генератора (CLI исключён).

## [0.5.0] - 2026-05-22

> Итерация 22: обогащённый отчёт — топ-разбивки (UTM, гео+устройство, страницы входа/выхода) в DOCX/PDF.

### Added

- Итерация 22 — **обогащённый отчёт**: в `ReportSnapshot` добавлены агрегированные топ-разбивки
  (UTM, гео+устройство, страницы входа и выхода — топ-5 по визитам), считаются детерминированно из
  кэша в `SnapshotBuilder` (чистый модуль `report/breakdowns.ts`: `topUtm`/`topGeoDevice`/`topPages`).
  DOCX и PDF (общий `reportSections`) теперь печатают эти секции. Render-путь остаётся
  детерминированным (без `Date.now`/LLM). 100% покрытие.

## [0.4.0] - 2026-05-22

> Дашборд-итерации 19–20: панель «Слабые места» на Overview и страница Sources («Откуда эта цифра?»).

### Added

- Итерация 20 — страница **Sources** («Откуда эта цифра?»): поиск сырого ответа Метрики по
  `raw_response_id` (через `GET /api/metrics/raw/:id`, клиент `api.rawResponse`) с показом endpoint,
  query_hash, периода, времени выгрузки и JSON-пейлоада. Прямая поддержка принципа
  anti-hallucination — любое число прослеживается до `raw_responses` в SQLite. 100% покрытие;
  e2e проверяет lookup.
- Итерация 19 — панель **«Слабые места»** на Overview: каналы с реальным трафиком, но конверсией ниже
  средней по выборке (самые крупные «утечки»), топ-5 по визитам. Чистый агрегатор `weakSpots` в
  `lib/overview` (по каналам, фильтр CR < общей, защита от деления на ноль), считается из уже
  загруженных `channel_stats`. 100% покрытие; e2e проверяет наличие панели.

## [0.3.0] - 2026-05-22

> Дашборд-итерации 15–17: страницы Behavior (входы/выходы), Trends (временные ряды + WoW) и расширение парсера (page/exit-page).

### Added

- Итерация 17 — страница **Trends** (временные ряды + WoW): динамика визитов и заявок по дням
  (ECharts-линия) и сравнение «неделя к неделе» (последние 7 дней против предыдущих 7) со стрелками
  ▲/▼. Считается детерминированно на клиенте из уже сохранённых данных `channel_stats` (агрегаторы
  `dailySeries`/`weekOverWeek`/`trendsOption`) — без дублирующего bytime-запроса, т.к. парсер уже
  пишет данные по дням. 100% покрытие; e2e проверяет страницу Trends.
- Итерация 16 — **страницы выхода** (расширение парсера): новый запрос Stat API `exit-page-behavior`
  (`ym:s:exitURL`), отдельная таблица `exit_page_stats` (migration 009) + методы репозитория
  (`upsertExitPageStats`/`listExitPageStats`), интеграция в `SyncService.syncExitPages` + `syncAll`
  (поле `exitPageRows` в `SyncSummary`), эндпоинт `GET /api/metrics/exit-pages`, клиент
  `api.exitPages()`. Страница **Behavior** теперь показывает две таблицы — «Страницы входа» и
  «Страницы выхода» (общий агрегатор `pageRows`, два запроса через `combineStatus`). Переиспользует
  тип `PageStat`. 100% покрытие; e2e проверяет обе таблицы.
- Итерация 15 — **поведение страниц** (расширение парсера) и страница **Behavior**: новый запрос Stat
  API `page-behavior` (`ym:s:startURL` + `ym:s:bounceRate`), отдельная таблица `page_stats`
  (migration 008) с историей по дням и репозиторием (`upsertPageStats`/`listPageStats`), интеграция
  в `SyncService.syncPages` + `syncAll` (поле `pageRows` в `SyncSummary`), эндпоинт
  `GET /api/metrics/pages`, клиент `api.pages()` и страница **Behavior** в навигации (таблица страниц
  входа с визит-взвешенным показателем отказов и CR, агрегатор `pageRows`). Своя таблица — чтобы не
  дублировать визиты. 100% покрытие; e2e проверяет страницу Behavior.

## [0.2.0] - 2026-05-22

> Дашборд-итерации 8–13: отчёты (DOCX/PDF), Funnel, расширение парсера (UTM, гео/девайс) и страница Audience.

### Added

- Итерация 13 — **гео + девайс** (расширение парсера) и страница **Audience**: новый запрос Stat API
  `geo-device-breakdown` (`ym:s:regionCountry,ym:s:deviceCategory`), отдельная таблица
  `geo_device_stats` (migration 007) с историей по дням и репозиторием
  (`upsertGeoDeviceStats`/`listGeoDeviceStats`), интеграция в `SyncService.syncGeoDevice` + `syncAll`
  (поле `geoDeviceRows` в `SyncSummary`), эндпоинт `GET /api/metrics/geo-device`, клиент
  `api.geoDevice()` и страница **Audience** в навигации (таблицы по стране и устройству, агрегаторы
  `byCountry`/`byDevice`). Своя таблица — чтобы не дублировать визиты. Общий сентинел `DIMENSION_NONE`
  (`UTM_NONE` оставлен как алиас). 100% покрытие; e2e проверяет страницу Audience.
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

[Unreleased]: https://github.com/Fighter90/metrika_analyse_dashboard/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/Fighter90/metrika_analyse_dashboard/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Fighter90/metrika_analyse_dashboard/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Fighter90/metrika_analyse_dashboard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/Fighter90/metrika_analyse_dashboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v0.1.0
