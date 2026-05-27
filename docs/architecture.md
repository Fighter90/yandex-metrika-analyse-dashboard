# Архитектура

> 🇷🇺 Русский. Обзорный документ; детали — в ADR (`docs/decisions/`) и коде.

Локальный инструмент: парсит Яндекс.Метрику → SQLite → дашборд → DOCX/PDF. Никакого облака.

**Текущая версия:** v2.8.1 (2026-05-27)

## Компоненты

```mermaid
flowchart TD
  YM[Яндекс.Метрика API] -- OAuth --> CLIENT[MetrikaClient<br/>rate limit + retry + Zod]
  CLIENT --> SYNC[SyncService<br/>daily chunks]
  SYNC --> RAW[(raw_responses)]
  SYNC --> CH[(channel_stats)]
  SYNC --> UTM[(utm_stats)]
  SYNC --> GEO[(geo_device_stats)]
  SYNC --> PG[(page_stats)]
  SYNC --> EXPG[(exit_page_stats)]
  subgraph SQLite [SQLite · better-sqlite3]
    RAW
    CH
    UTM
    GEO
    PG
    EXPG
    GOALS[(goals)]
    HYP[(hypotheses)]
    DEC[(decisions)]
    B2B[(b2b_manual)]
    SNAP[(report_snapshots)]
    SNAP_AI[(aiNarrative in snapshots)]
  end
  REPO[Repositories] --- SQLite
  API[Fastify API<br/>/api/*] --> REPO
  SWAGGER[Swagger /docs] --- API
  UI[React 18 + Vite дашборд<br/>9 страниц + мобильное меню] -- TanStack Query --> API
  SNAPB[SnapshotBuilder] --> SNAP
  SNAPB --> DOCX[DOCX<br/>markdown formatting]
  SNAPB --> PDF[PDF · Puppeteer<br/>markdown HTML]
  AI[Anthropic Claude<br/>5 chunks × 6000 tokens] -.-> SNAP_AI
```

## Слои

| Слой       | Где                                      | Технологии                                           |
| ---------- | ---------------------------------------- | ---------------------------------------------------- |
| Извлечение | `code/backend/src/metrika/`              | undici fetch, Zod, token-bucket, retry               |
| Хранение   | `code/backend/src/db/`                   | better-sqlite3, миграции, repository pattern         |
| API        | `code/backend/src/routes/`               | Fastify 4, Zod, Swagger                              |
| Аналитика  | `code/backend/src/analytics/`            | ICE, traffic-light, KPI, forecast                    |
| AI-анализ  | `code/backend/src/report/ai-insights.ts` | Anthropic Claude, 5 chunks × 6000 tokens             |
| Отчёты     | `code/backend/src/report/`               | `docx` (markdown), Puppeteer (markdown HTML)         |
| Фронтенд   | `code/frontend/`                         | React 18, Vite, Tailwind, ECharts, TanStack, Zustand |
| Общее      | `code/shared/`                           | типы, `ICE_CONFIG`, валидация, report-sections       |

## Страницы дашборда (9)

Страницы «Гипотезы», «Решения» и «B2B» удалены из навигации в v2.7.0.
Гипотезы и Decision Log теперь генерируются AI и встраиваются в отчёт (`snapshot.generatedHypotheses`,
`snapshot.generatedDecisions`). Ввод B2B-сделок перенесён в сворачиваемую секцию «B2B-пайплайн»
в Настройках. Устаревшие URL `/hypotheses`, `/decisions` → `/report`; `/b2b` → `/settings`.

| Страница  | URL         | Описание                                                                                     |
| --------- | ----------- | -------------------------------------------------------------------------------------------- |
| Обзор     | `/`         | KPI-стрип («Оплат» для целей-покупок), дайджест за неделю (WoW), визиты/заявки, микс каналов |
| Трафик    | `/traffic`  | Бар-чарт каналов, визиты vs заявки, таблица каналов, UTM-Sankey, подписи                     |
| Поведение | `/behavior` | CR страниц входа, отказы, таблицы с подсветкой, рекомендации, подписи                        |
| Воронка   | `/funnel`   | 4 этапа, воронка по каналам, CR по каналам, анализ потерь, B2B по этапам, подписи            |
| Цели      | `/goals`    | Прогресс-ринг, метрики, B2B сделки, прогноз                                                  |
| Отчёт     | `/report`   | Snapshot; AI-гипотезы и AI Decision Log внутри отчёта; AI-анализ (HTML); экспорт DOCX/PDF    |
| История   | `/history`  | Список снапшотов (горизонтальный скролл), «Просмотреть» → сохранённый отчёт                  |
| Настройки | `/settings` | OAuth, COUNTER_ID, GOAL_ID select, ANTHROPIC_API_KEY, sync с прогрессом, секция B2B-пайплайн |
| Справка   | `/help`     | Документация, FAQ (10 вопросов), глоссарий                                                   |

## Ключевые решения

- SQLite, без Docker (`decisions/002-sqlite-vs-postgres.md`, `007-data-history-by-day.md`).
- ICE = произведение (`decisions/005-ice-product-vs-mean.md`).
- PDF через Puppeteer из той же страницы превью (`decisions/003-pdf-via-puppeteer.md`).
- B2B — ручной ввод (`decisions/004-b2b-manual-entry.md`).
- Тестовое окружение и 100% покрытие (`decisions/006-test-tooling.md`).
- AI-анализ в 5 chunked запросах с max_tokens 6000 (v2.4.0+).
- DOCX/PDF с markdown-форматированием (таблицы, списки, bold, italic).
- Трафик агрегируется по каналу перед записью в `channel_stats` (суммирование визитов/пользователей/заявок по всем строкам одного источника), поэтому данные дашборда после re-sync совпадают с итогами Яндекс.Метрики по дням (v2.6.0).
- Синхронизация валидирует OAuth-токен (запрос целей) до очистки производных таблиц — протухший токен не оставляет пустую базу (v2.6.0).
