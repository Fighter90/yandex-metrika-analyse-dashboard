# ProductCamp Conversion Analytics Dashboard

Локально запускаемый аналитический инструмент для трека **«Конверсии и лидген» ProductCamp**.
Подключается по OAuth к Яндекс.Метрике (счётчик `54280963`), кэширует данные в SQLite,
поднимает интерактивный дашборд и помогает вести продуктовые гипотезы по методологии
Воронковой (Double Diamond + ICE = I × C × E) с генерацией DOCX/PDF-отчётов.

> **KPI кампании:** 300+ **платных** билетов. Везде в инструменте: **заявка ≠ оплата**.

> ⚠️ **Статус: Итерация 0 (скелет).** Сейчас работают: монорепо, backend `/api/health`,
> frontend-заглушка, `./run.sh`, CI. Дашборд, гипотезы и отчёты появятся в следующих
> итерациях (см. [Roadmap](#roadmap)). Документация ниже описывает целевой сценарий и
> отмечает, что доступно уже сегодня.

## Скриншоты

_Появятся по мере готовности страниц: Overview, Hypotheses, Decisions, Report Preview._

## Quickstart

```bash
git clone git@github.com:Fighter90/metrika_analyse_dashboard.git
cd metrika_analyse_dashboard
cp .env.example .env        # затем впишите YANDEX_OAUTH_TOKEN (см. ниже)
./run.sh
```

`./run.sh` сам поставит `pnpm` при отсутствии, установит зависимости, (с итерации 1)
прогонит миграции, поднимет backend + frontend и откроет браузер на
`http://localhost:5173`. Backend API — на `http://localhost:4000` (проксируется как `/api`).

Подробный разбор запуска и устранение проблем — в [docs/runbook.md](docs/runbook.md).
Руководство пользователя (дашборд, отчёты) — в [docs/user-guide.md](docs/user-guide.md).

## Как получить `YANDEX_OAUTH_TOKEN`

Нужен токен со scope `metrika:read`. Документация Яндекс ID: https://yandex.ru/dev/id/doc/ru/.

1. Приложение уже зарегистрировано (ClientID лежит в вашем локальном `.env`).
2. Откройте в браузере (подставив ClientID):
   `https://oauth.yandex.ru/authorize?response_type=token&client_id=<YANDEX_CLIENT_ID>`
3. Подтвердите доступ. Токен вернётся в адресной строке после `#access_token=...`.
4. Скопируйте его в `.env` → `YANDEX_OAUTH_TOKEN=...`.

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

| Команда | Описание |
|---|---|
| `pnpm dev` | backend (tsx watch) + frontend (vite) |
| `pnpm build` | сборка |
| `pnpm typecheck` | проверка типов |
| `pnpm lint` / `pnpm format` | линт / форматирование |
| `pnpm test` | vitest |

_Команды `sync` / `report` / `new-decision` подключаются в итерациях 2/9/7._

## CI/CD

`.github/workflows/ci.yml` на каждый push/PR: `install → lint → typecheck → test → build`
и заливает артефакт сборки frontend. `e2e.yml` и `release.yml` — в итерации 11.

## Roadmap

- [x] **Итерация 0** — скелет, skill-файлы, CLAUDE.md, run.sh, CI.
- [ ] **1** — SQLite + миграции 001–005 + repository pattern + тесты.
- [ ] **2** — Metrika-клиент (OAuth, Zod, rate limiter, retry) + `POST /api/sync`.
- [ ] **3** — Backend API (metrics/hypotheses/decisions/b2b) + Swagger.
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
