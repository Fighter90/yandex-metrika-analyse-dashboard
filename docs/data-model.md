# Модель данных (SQLite)

> Источник истины — миграции `code/backend/src/db/migrations/001..006`. Доступ только через
> репозитории (`code/backend/src/db/repositories/`). История копится по дням (см. ADR-007).

## Таблицы

| Таблица            | Назначение                             | Ключ / история                                                                                                                                |
| ------------------ | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `goals`            | цели Метрики (seed)                    | PK `id`; `is_archived` если `id < ARCHIVED_GOAL_ID_THRESHOLD`                                                                                 |
| `raw_responses`    | сырые ответы API (прослеживаемость)    | UNIQUE `(query_hash, date_from, date_to)` — идемпотентный кэш                                                                                 |
| `channel_stats`    | нормализованные метрики по каналам     | PK `(date, channel, utm_source, utm_medium, utm_campaign)` — **по дням**                                                                      |
| `utm_stats`        | разбивка по UTM source/medium/campaign | PK `(date, utm_source, utm_medium, utm_campaign)` — **по дням**; пропуски → `(none)`, отдельно от `channel_stats` чтобы не дублировать визиты |
| `hypotheses`       | гипотезы в формате Воронковой          | `ice_score` GENERATED `impact*confidence*ease`                                                                                                |
| `b2b_manual`       | ручной B2B-пайплайн                    | этапы lead/negotiation/invoiced/paid                                                                                                          |
| `report_snapshots` | immutable снапшоты отчётов             | PK `id` (ulid)                                                                                                                                |
| `decisions`        | Decision Log                           | FK → `hypotheses`; `number` UNIQUE (DL-NNN)                                                                                                   |
| `_migrations`      | трекинг применённых миграций           | PK `name`                                                                                                                                     |

## Связи и инварианты

- `decisions.hypothesis_id` → `hypotheses.id` (FK, `PRAGMA foreign_keys=ON`).
- При создании `decision` статус связанной гипотезы атомарно становится `outcome` (green/yellow/red).
- `hypotheses.parent_id` → `hypotheses.id` (solution → problem).
- Гипотеза не сохраняется без формата Воронковой (≥3 допущения по 3 категориям, ≥2 метода) —
  проверка на уровне репозитория (`validateHypothesis` из `@pca/shared`).
- `decisions` требует ≥1 evidence.

## История по дням

Повторный `pnpm sync` дополняет `raw_responses` и `channel_stats` новыми датами, не затирая
прошлые (`INSERT … ON CONFLICT`). Это даёт WoW-сравнения и воспроизводимость отчётов.
Файл БД: `data/productcamp.sqlite` (gitignored).
