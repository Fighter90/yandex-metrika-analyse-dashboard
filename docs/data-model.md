# Модель данных (SQLite)

> Источник истины — миграции `code/backend/src/db/migrations/001..009`. Доступ только через
> репозитории (`code/backend/src/db/repositories/`). История копится по дням (см. ADR-007).

## Таблицы

| Таблица            | Назначение                                                                                     | Ключ / история                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `goals`            | цели Метрики (seed)                                                                            | PK `id`; `is_archived` если `id < ARCHIVED_GOAL_ID_THRESHOLD`                                                                                 |
| `raw_responses`    | сырые ответы API (прослеживаемость)                                                            | UNIQUE `(query_hash, date_from, date_to)` — идемпотентный кэш                                                                                 |
| `channel_stats`    | нормализованные метрики по каналам                                                             | PK `(date, channel, utm_source, utm_medium, utm_campaign)` — **по дням**                                                                      |
| `utm_stats`        | разбивка по UTM source/medium/campaign                                                         | PK `(date, utm_source, utm_medium, utm_campaign)` — **по дням**; пропуски → `(none)`, отдельно от `channel_stats` чтобы не дублировать визиты |
| `geo_device_stats` | разбивка по стране + типу устройства                                                           | PK `(date, country, device)` — **по дням**; пропуски → `(none)`, отдельная таблица чтобы не дублировать визиты                                |
| `page_stats`       | поведение страниц входа (startURL)                                                             | PK `(date, page)` — **по дням**; визиты + bounce rate; отдельная таблица чтобы не дублировать визиты                                          |
| `exit_page_stats`  | поведение страниц выхода (exitURL)                                                             | PK `(date, page)` — **по дням**; визиты + bounce rate; отдельная таблица чтобы не дублировать визиты                                          |
| `hypotheses`       | гипотезы методологии; с v2.7.0 AI-гипотезы хранятся в `report_snapshots.generatedHypotheses`   | `ice_score` GENERATED `impact*confidence*ease`                                                                                                |
| `b2b_manual`       | ручной B2B-пайплайн; с v2.7.0 ввод через секцию «B2B-пайплайн» в Настройках                    | этапы lead/negotiation/invoiced/paid                                                                                                          |
| `report_snapshots` | immutable снапшоты; поля `generatedHypotheses` и `generatedDecisions` хранят AI-контент отчёта | PK `id` (ulid)                                                                                                                                |
| `decisions`        | Decision Log; с v2.7.0 AI Decision Log хранится в `report_snapshots.generatedDecisions`        | FK → `hypotheses`; `number` UNIQUE (DL-NNN)                                                                                                   |
| `_migrations`      | трекинг применённых миграций                                                                   | PK `name`                                                                                                                                     |

## Связи и инварианты

- `decisions.hypothesis_id` → `hypotheses.id` (FK, `PRAGMA foreign_keys=ON`).
- При создании `decision` статус связанной гипотезы атомарно становится `outcome` (green/yellow/red).
- `hypotheses.parent_id` → `hypotheses.id` (solution → problem).
- Гипотеза не сохраняется без формата методологии проверки гипотез (≥3 допущения по 3 категориям, ≥2 метода) —
  проверка на уровне репозитория (`validateHypothesis` из `@pca/shared`).
- `decisions` требует ≥1 evidence.

## История по дням

Повторный `pnpm sync` дополняет `raw_responses` и `channel_stats` новыми датами, не затирая
прошлые (`INSERT … ON CONFLICT`). Это даёт WoW-сравнения и воспроизводимость отчётов.
Файл БД: `data/productcamp.sqlite` (gitignored).

> **Агрегация по каналу (v2.6.0).** Запрос трафика группируется по (источник, поисковая система),
> поэтому один источник может дать несколько строк. При записи в `channel_stats` визиты,
> пользователи и заявки суммируются по каналу, так что в таблице хранится одна строка на
> `(date, channel)`. Благодаря этому итоги дашборда совпадают с Яндекс.Метрикой после re-sync.
