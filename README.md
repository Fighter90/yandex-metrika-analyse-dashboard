# ProductCamp Conversion Analytics Dashboard

> 🇷🇺 Русский · [🇬🇧 English](README.en.md)

Локально запускаемый аналитический инструмент для трека **«Конверсии и лидген» ProductCamp**.
Подключается по OAuth к Яндекс.Метрике (счётчик задаётся в `.env`), кэширует данные в SQLite,
поднимает интерактивный дашборд и помогает вести продуктовые гипотезы по структурированной
методологии гипотез (Double Diamond + ICE = I × C × E) с генерацией DOCX/PDF-отчётов.

> **KPI кампании:** 300+ **платных** билетов. Везде в инструменте: **заявка ≠ оплата**.

> ✅ **Статус: рабочий продукт v2.9.4.** Дашборд из 9 страниц (Обзор, Трафик, Поведение,
> Воронка, Цели, Отчёт, История, Настройки, Справка), мобильное меню (гамбургер), AI-анализ
> в 5 секций с прогресс-баром (HTML-рендеринг), синхронизация с детальным прогрессом (10 стадий
> с описанием), детальные аналитические выводы на каждой странице (зелёный/жёлтый/красный),
> кастомный date picker (от/до, макс. 365 дней), пресеты 7д/14д/30д/90д/1г, GOAL_ID select
> из Метрики, History → «Просмотреть» открывает сохранённый снапшот, настройки с отображением
> текущего COUNTER_ID, PDF авто-поиск Chrome, GOST-форматирование DOCX/PDF, полный CI/CD.
> Гипотезы и Decision Log генерируются AI внутри отчёта; B2B-пайплайн ведётся в разделе «Настройки».
> Проверено на живых данных счётчика ProductCamp (`<COUNTER_ID>` из `.env`).

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
- `COUNTER_ID` — ваш счётчик Яндекс.Метрики (нужен для живого sync; задаётся в `.env`);
- `GOAL_ID` — id цели KPI; `0` (по умолчанию) = **авто-определение** основной цели оплаты/покупки из
  списка целей счётчика, любое значение `> 0` жёстко фиксирует цель;
- предложит сразу настроить **OAuth Яндекс.Метрики** (`pnpm auth`).

**Шаг 3 — `./run.sh`** ставит `pnpm` при отсутствии, прогоняет миграции, затем: при наличии
`YANDEX_OAUTH_TOKEN` тянет живые данные (`pnpm sync`; при `GOAL_ID=0` цель определяется
автоматически, иначе передаётся `--goalId=$GOAL_ID`), иначе наполняет дашборд
**демо-данными** (`pnpm seed`), поднимает backend + frontend и открывает
`http://localhost:5173` (API — `http://localhost:4000`, проксируется как `/api`).

> Без токена и без AI-ключа всё равно запустится в демо-режиме — удобно показать инструмент сразу.

Подробный разбор запуска и устранение проблем — в [docs/runbook.md](docs/runbook.md).
Руководство пользователя (дашборд, отчёты) — в [docs/user-guide.md](docs/user-guide.md).
Полная справка по дашборду — на странице **Справка** (`http://localhost:5173/help`).

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
React 18 + Vite 5 · TailwindCSS · Apache ECharts · TanStack Table/Query ·
Zustand · `docx` · Puppeteer · date-fns(-tz) · Vitest + Playwright · ESLint + Prettier · pnpm 9.

Добавление зависимостей вне списка требует ADR в `docs/decisions/`.

## Методология (Double Diamond + структурированный формат гипотезы)

Верхний уровень процесса — **Double Diamond**; внутри фаз Define/Develop — структурированный
формат гипотезы:

- **Формат гипотезы:** «{subject} {action} {solution}, если {condition}».
- **≥3 скрытых допущения** в категориях behavior / market / tech.
- **≥2 способа проверки** (synthetic CustDev / live / quantitative / market).
- **ICE = I × C × E (product, 1–1000)** — наказывает однобокие гипотезы; см.
  `docs/decisions/005-ice-product-vs-mean.md`.
- **Светофор** (🟢/🟡/🔴) с конкретными порогами + дедлайн проверки.
- **Decision Log** замыкает цикл: проверка → запись DL-{N} → авто-обновление статуса гипотезы.

Методология описана в `docs/methodology-hypotheses.md`.

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
   `/api/b2b`, `/api/report/*`, `/api/sync`, `/api/settings`; Swagger на `/docs`.
   Репозитории инжектятся в `buildServer(deps)`.
5. **Дашборд.** React + TanStack Query читает API; страницы — паттерн «чистая View(status,…) + тонкий
   data-wrapper»; графики на ECharts. KPI всюду разделяет **заявку и оплату**.
   - **Сегмент-фильтр** (B2C / B2C+B2B / B2B): фильтрует каналы и UTM на всех страницах.
   - **📅 Выбрать даты**: кастомный date picker (от/до).
   - **🔄 Перестроить отчёт**: кнопка на странице «Отчёт» — перестраивает снапшот с текущими фильтрами.
   - **Архивные цели**: checkbox включает/отключает показ архивных целей Метрики.
   - **Мобильное меню**: гамбургер на экранах < 1024px.
   - **Аналитические выводы**: на каждой странице — цветные бейджи (🟢 хорошо, 🔴 проблема).
6. **Отчёт.** `SnapshotBuilder` собирает **неизменяемый** `ReportSnapshot` из БД (детерминированно:
   `id` и `generatedAt` — входные параметры, без `Date.now()`/LLM в render-пути). `reportSections`
   даёт общий контент для DOCX (`docx/builder.ts`) и PDF (`pdf/html.ts` → `pdf/renderer.ts` через
   puppeteer-core). **AI-анализ** генерится в 5 секций (chunked, с таймаутом на секцию),
   рендерится как HTML (таблицы, заголовки, форматирование).

## Страницы дашборда

| Страница      | URL         | Описание                                                                                                                                                                            |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Обзор**     | `/`         | KPI-цель (метка «Оплат» для целей-покупок); заявки, gap; графики визитов/заявок по дням; микс каналов; топ стран; доля устройств; UTM-разбивка; страницы входа/выхода; слабые места |
| **Трафик**    | `/traffic`  | Бар-чарт каналов; визиты vs заявки; таблица каналов с CR; UTM-разбивка; insights                                                                                                    |
| **Поведение** | `/behavior` | CR страниц входа; отказы страниц входа/выхода; таблицы с цветовой подсветкой; рекомендации                                                                                          |
| **Воронка**   | `/funnel`   | 4 этапа (Визиты → Заявки B2C → B2B pipeline → Оплачено B2B); анализ потерь; CR по каналам; B2B по этапам; проблемные страницы                                                       |
| **Цели**      | `/goals`    | Прогресс-ринг к 300 билетам; метрики; B2B сделки; рекомендации на основе данных                                                                                                     |
| **Отчёт**     | `/report`   | Генерация снапшота; AI-гипотезы («Решенческие/Проблемные гипотезы (AI)») и AI Decision Log внутри отчёта; AI-анализ (5 секций, HTML); экспорт DOCX/PDF; перестроение                |
| **История**   | `/history`  | Список снапшотов; кнопка «Просмотреть» → открывает сохранённый отчёт                                                                                                                |
| **Настройки** | `/settings` | OAuth-токен, Client ID/Secret, COUNTER_ID, GOAL_ID, ANTHROPIC_API_KEY; синхронизация с прогресс-баром (10 стадий); текущий счётчик; сворачиваемая секция «B2B-пайплайн»             |
| **Справка**   | `/help`     | Полная документация: описание всех страниц, фильтров, FAQ (10 вопросов), глоссарий                                                                                                  |

## Фильтры (шапка дашборда)

- **7д / 14д / 30д / 90д / 1г** — быстрые пресеты периода
- **📅 Даты** — кастомный период (дата начала → дата окончания → Применить, макс. 365 дней)
- **Сегмент**: B2C / B2C+B2B / B2B (фильтрует каналы и UTM)
- **Архивные цели** — показать/скрыть архивные цели Метрики

## Виды отчётов и как их строить (end-to-end)

Отчёт строится из **immutable-снапшота** — это гарантирует, что один `snapshotId` всегда даёт один и
тот же контент (anti-hallucination + воспроизводимость).

**Что входит в отчёт** (секции `reportSections`):

- Обложка (период, ID среза, цель), Краткие итоги (заявки B2C, оплачено B2B, gap — «заявка ≠ оплата»),
  Методология (Double Diamond + структурированный формат гипотезы, с атрибуцией);
- **Define — Problem Hypotheses** и **Develop — Solution Hypotheses** (с ICE и дедлайнами);
- **Deliver — Decision Log** (DL-{N} с исходами);
- **Топ-разбивки**: UTM, гео+устройство, страницы входа, страницы выхода (топ-5 по визитам);
- **AI-анализ** (5 секций: Итог, Каналы/UTM/Аудитория, Страницы/Воронка, Риски/Рекомендации,
  Гипотезы/Дорожная карта) — рендерится как HTML с форматированием;
- **Data Appendix** (каналы за период).

**Форматы:** **DOCX** (работает из коробки) и **PDF** (нужен локальный Chrome через
`PUPPETEER_EXECUTABLE_PATH`). Файлы пишутся в `data/reports/{snapshotId}.{docx|pdf}`.

**Шаги (через дашборд, страница Отчёт):**

1. Выберите период в шапке. Нажмите **«Сформировать срез данных»** → `POST /api/report/snapshot`
   строит и сохраняет снапшот, показывает сводку KPI.
2. (Опц.) **«Сгенерировать AI-анализ»** → `POST /api/report/insights` вызывает Anthropic из чисел
   снапшота (5 секций, ~30–60с). Без `ANTHROPIC_API_KEY` — понятное сообщение, отчёт строится без
   AI-секции.
3. **«Перестроить отчёт»** — обновить снапшот с текущими фильтрами.
4. **Export DOCX** / **Export PDF** → `POST /api/report/generate` рендерит файл из снапшота.

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

Любое число в отчёте прослеживается до `raw_responses` в SQLite (на дашборде — страница **Справка**
по описанию источников данных).

## Структура проекта

```
.
├── code/
│   ├── backend/    # Fastify API, Metrika-клиент, SQLite, аналитика, отчёты
│   ├── frontend/   # React + Vite дашборд
│   └── shared/     # общие типы и константы (ICE_CONFIG)
├── docs/           # архитектура, модель данных, методология, руководство, runbook, ADR
├── QA/             # промпты для тестирования: регресс + UX
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
| `pnpm test` / `pnpm coverage`                   | vitest (397 тестов проходят)                                   |

## Разработка по спецификациям (Spec-Driven Development)

Нетривиальные фичи (затрагивают > 1 файла или > ~30 минут; меняют данные, API, методологию или
KPI-математику) проходят через **спеку** до кода: `docs/specs/NNN-*.md` по шаблону
[`docs/specs/TEMPLATE.md`](docs/specs/TEMPLATE.md). Цикл — **spec → review → plan → tests → impl**:
сначала фиксируется _что_ и _почему_ с измеримыми критериями приёмки, затем пишутся падающие тесты
(TDD red→green→refactor), затем реализация; каждый PR ссылается на спеку. Реестр и процесс —
[`docs/specs/README.md`](docs/specs/README.md). Мелкие правки (опечатки, чистка, доки) спеки не требуют.

## CI/CD

Полный набор пайплайнов на каждый push/PR:

- **ci.yml** — `lint → format:check → typecheck → coverage (Node 20 + 22) → build` + actionlint + gate;
- **e2e.yml** — Playwright (smoke по всему дашборду);
- **security.yml** — gitleaks + `pnpm audit` (high+);
- **review.yml** — AI code-review (если задан `ANTHROPIC_API_KEY` в секретах репо);
- **pr-lint.yml** — Conventional PR title;
- **release.yml** — по тегу `v*.*.*`: verify → упаковка (app tar.gz + frontend zip + checksums) → GitHub Release.

## Готово (статус по итерациям)

- [x] Скелет, SQLite + миграции, repository pattern, тесты, CI/CD, версионирование.
- [x] Metrika-клиент (OAuth, Zod, rate limiter, retry) + `POST /api/sync`, CLI `pnpm auth`/`sync`/`seed`.
- [x] Backend API (metrics/hypotheses/decisions/b2b/report/settings) + Swagger `/docs`.
- [x] Дашборд: 9 страниц (Обзор, Трафик, Поведение, Воронка, Цели, Отчёт, История, Настройки, Справка).
- [x] AI-генерация гипотез и Decision Log внутри отчёта (snapshot.generatedHypotheses / snapshot.generatedDecisions); B2B-пайплайн в Настройках.
- [x] Snapshot + Report Preview + детерминированные DOCX/PDF + AI-анализ (5 секций, HTML-рендеринг).
- [x] Мобильное меню (гамбургер), кастомный date picker, сегмент-фильтр (B2C/B2C+B2B/B2B).
- [x] Аналитические выводы на каждой странице (цветные бейджи), History → «Просмотреть».
- [x] Настройки: прогресс-бар синхронизации (10 стадий), отображение текущего COUNTER_ID.
- [x] Страница «Справка»: полная документация (9 разделов, 10 FAQ, глоссарий).
- [x] 397 тестов проходят (shared: 54, backend: 222, frontend: 121).
- [x] Проверено на живых данных Метрики (счётчик `<COUNTER_ID>` из `.env`); security-аудит + `.gitignore`.

### Known limitations

- B2B — ручной ввод (`b2b_manual`), Метрика B2B-пайплайн не покрывает.
- UTM-разметка неравномерная: сегменты с покрытием < 70% помечаются `low_utm_coverage`.
- Цели с `id < ARCHIVED_GOAL_ID_THRESHOLD` (по умолчанию 77) считаются архивными.
- `ym:s:exitURL` не поддерживается Stat API → таблица «Страницы выхода» на живых данных пустая.
- PDF требует локального Chrome (`PUPPETEER_EXECUTABLE_PATH`); DOCX — без зависимостей.

## Релизы

| Версия                                                                                 | Дата       | Описание                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **v2.9.4** (Latest)                                                                    | 2026-05-29 | PDF: жирный/курсив рендерятся настоящими тегами (нет литеральных `<strong>` в PDF); убрана заглушка обрезки AI-секции в DOCX/PDF                                                                        |
| [v2.9.3](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.9.3)   | 2026-05-29 | Согласование Gap на «Обзоре» с «Целями»/отчётом (учёт оплат-покупки), удаление пустых разделов из DOCX/PDF, очистка AI-нарратива от HTML-тегов; сверено с Яндекс.Метрикой                               |
| [v2.9.2](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.9.2)   | 2026-05-29 | Обновление зависимостей (docx 9.7.1, react-query, zustand, lucide-react, typescript-eslint) + полная проверка кода                                                                                      |
| [v2.9.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.9.1)   | 2026-05-29 | Финальная полировка AI-DOCX: убраны эмодзи/двойная нумерация в AI-заголовках, лимит длины AI-секций, титул без пустых прогонов, KPI-лейбл из goalLabel, дедуп URL страниц, маска API-ключа в Настройках |
| [v2.9.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.9.0)   | 2026-05-28 | Переработка DOCX/PDF-отчёта: убраны дубли секций по каналам, очистка AI-нарратива от markdown, компактное приложение, AI-промпт без своей нумерации, AI-кнопка блокируется после генерации              |
| [v2.8.5](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.5)   | 2026-05-28 | Актуализация QA регресс-промта (M-004 закрыт) + синхронизация версии в документах                                                                                                                       |
| [v2.8.4](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.4)   | 2026-05-28 | Фикс UTM-покрытия (визит-взвешенно из utm_stats, было 0%); подробные docs (user-guide, quickstart, data-model)                                                                                          |
| [v2.8.3](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.3)   | 2026-05-28 | Фикс прогресса «Целей» (учёт оплат-покупок), Executive Summary в полном HTML + секция «Итоговый вывод», разворот UTM-Sankey, ГОСТ-титул DOCX/PDF без пустых блоков                                      |
| [v2.8.2](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.2)   | 2026-05-28 | Браузерный E2E-аудит: фикс дублей React-ключей (Обзор/Воронка), favicon; обновлены docs и полный регресс-промт; вычищен живой COUNTER_ID из репозитория                                                 |
| [v2.8.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.1)   | 2026-05-28 | Доступность WCAG AA: контраст текста ≥4.5:1, клавиатурный доступ к таблицам — 0 нарушений axe на 9 страницах                                                                                            |
| [v2.8.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.8.0)   | 2026-05-28 | Графики-изображения в DOCX/PDF (бар/воронка/микс) + блок 🟢/🔴 у каждого графика (spec 014); мобильный bottom-sheet фильтров; B2B kanban+drawer; sync-versions + pre-commit                             |
| [v2.7.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.7.1)   | 2026-05-27 | Sync по периоду фильтра, оси бар-чарта, formatGoalLabel в отчёте/Целях, inv-тест визитов, mobile e2e, блок 🟢/🔴 в отчёте; полная сверка с Метрикой (0 расхождений)                                     |
| [v2.7.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.7.0)   | 2026-05-27 | Навигация → 9 страниц; AI-гипотезы и AI Decision Log в отчёте; B2B-пайплайн в Настройках; formatGoalLabel («Оплат»); единая палитра цветов каналов                                                      |
| [v2.6.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.6.0)   | 2026-05-27 | Подписи под графиками, дайджест за неделю, новые графики (Sankey/heatmap), фикс недоучёта визитов по каналам (сверка с Метрикой), безопасный re-sync, mobile-polish                                     |
| [v2.5.7](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.5.7)   | 2026-05-27 | Hotfix билда/гейта (TS в DOCX/фронте) + синхронизация версий, 100% coverage                                                                                                                             |
| [v2.4.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.4.1)   | 2026-05-27 | Документация и архитектура, выравнивание под 9-страничный дашборд                                                                                                                                       |
| [v2.3.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.3.0)   | 2026-05-27 | AI-анализ без обрезаний, md-to-html с таблицами/списками, DOCX/PDF GOST                                                                                                                                 |
| [v2.2.1](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.2.1)   | 2026-05-27 | Goals Page NaN Fix                                                                                                                                                                                      |
| [v2.2.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.2.0)   | 2026-05-27 | Gap Fix, History AI Narrative, DOCX/PDF GOST Formatting                                                                                                                                                 |
| [v2.1.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.1.0)   | 2026-05-27 | Фильтры до 1 года, GOAL_ID select, PDF авто-поиск, руководство пользователя                                                                                                                             |
| [v2.0.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v2.0.0)   | 2026-05-26 | Полная переработка дашборда (9 страниц, AI HTML, мобильное меню, Help page)                                                                                                                             |
| [v0.13.0](https://github.com/Fighter90/metrika_analyse_dashboard/releases/tag/v0.13.0) | 2026-05-26 | AI-анализ HTML, Help page, переработка воронки, прогресс-бар синхронизации                                                                                                                              |

## License · Authors · Credits

- Авторы: команда трека «Конверсии и лидген» ProductCamp.
