# Модель данных (SQLite)

> Источник истины — миграции `code/backend/src/db/migrations/001..009`. Доступ только через
> репозитории (`code/backend/src/db/repositories/`). История копится **по дням** (см. ADR-007).
> БД: `data/productcamp.sqlite` (gitignored), `better-sqlite3`, WAL + `PRAGMA foreign_keys=ON`.

## Обзор таблиц

| Таблица            | Назначение                                     | Ключ / история                                             |
| ------------------ | ---------------------------------------------- | ---------------------------------------------------------- |
| `goals`            | цели Метрики (seed при sync)                   | PK `id`                                                    |
| `raw_responses`    | сырые ответы Stat API (прослеживаемость / кэш) | UNIQUE `(query_hash, date_from, date_to)` — идемпотентно   |
| `channel_stats`    | нормализованные метрики по каналам             | PK `(date, channel, utm_source, utm_medium, utm_campaign)` |
| `utm_stats`        | разбивка по UTM source/medium/campaign         | PK `(date, utm_source, utm_medium, utm_campaign)`          |
| `geo_device_stats` | разбивка по стране + типу устройства           | PK `(date, country, device)`                               |
| `page_stats`       | поведение страниц входа (`ym:s:startURL`)      | PK `(date, page)`                                          |
| `exit_page_stats`  | поведение страниц выхода (`ym:s:exitURL`)      | PK `(date, page)`                                          |
| `hypotheses`       | гипотезы методологии (ручные)                  | PK `id`; `ice_score` GENERATED                             |
| `b2b_manual`       | ручной B2B-пайплайн                            | PK `id`; этапы lead/negotiation/invoiced/paid              |
| `report_snapshots` | immutable срезы данных для отчётов             | PK `id` (ulid)                                             |
| `decisions`        | Decision Log                                   | PK `id`; FK → `hypotheses`; `number` UNIQUE                |
| `_migrations`      | трекинг применённых миграций                   | PK `name`                                                  |

> **Где живут AI-гипотезы и AI Decision Log (с v2.7.0).** AI-сгенерированные гипотезы и решения
> хранятся НЕ в таблицах `hypotheses`/`decisions`, а внутри JSON-payload снапшота
> (`report_snapshots.payload.generatedHypotheses` / `.generatedDecisions`). Таблицы `hypotheses` и
> `decisions` остаются для ручной методологии и обратной совместимости API.

---

## Метрики из Метрики (по дням)

Все таблицы метрик аккумулируют историю **по дням** через колонку `date`: повторный `pnpm sync`
добавляет новые даты (`INSERT … ON CONFLICT`), не затирая прошлые. Это даёт WoW-сравнения и
воспроизводимость. Проценты Метрики (`bounce_rate`, `conversion_rate`) хранятся как **доля 0–1**.

### `goals`

| Колонка       | Тип     | Описание                      |
| ------------- | ------- | ----------------------------- |
| `id`          | INTEGER | id цели Метрики (PK)          |
| `name`        | TEXT    | название цели                 |
| `type`        | TEXT    | тип цели (напр. `e_purchase`) |
| `is_b2b`      | BOOLEAN | признак B2B-цели              |
| `is_archived` | BOOLEAN | архивная/удалённая цель       |
| `synced_at`   | TEXT    | время последней синхронизации |

Основная KPI-цель определяется классификатором `classifyGoal`/`selectPrimaryGoal` (`@pca/shared`):
цель типа «покупка» → её reaches считаются **оплатами**.

### `raw_responses`

| Колонка      | Тип     | Описание                                                         |
| ------------ | ------- | ---------------------------------------------------------------- |
| `id`         | INTEGER | PK (AUTOINCREMENT)                                               |
| `endpoint`   | TEXT    | эндпоинт Stat API                                                |
| `query_hash` | TEXT    | хэш параметров запроса                                           |
| `date_from`  | TEXT    | начало периода                                                   |
| `date_to`    | TEXT    | конец периода                                                    |
| `payload`    | JSON    | **сырой** ответ Метрики — источник правды для anti-hallucination |
| `fetched_at` | TEXT    | время получения                                                  |

UNIQUE `(query_hash, date_from, date_to)` → повторный запрос идемпотентен (кэш). Каждое число
дашборда/отчёта восстановимо отсюда.

### `channel_stats`

| Колонка                                      | Тип          | Описание                            |
| -------------------------------------------- | ------------ | ----------------------------------- |
| `date`                                       | TEXT         | дата (история по дням)              |
| `channel`                                    | TEXT         | канал трафика                       |
| `utm_source` / `utm_medium` / `utm_campaign` | TEXT         | UTM (часть PK; могут быть NULL)     |
| `visits` / `users`                           | INTEGER      | визиты / пользователи               |
| `bounce_rate` / `avg_duration`               | REAL         | отказы (0–1) / средняя длительность |
| `goal_reaches` / `conversion_rate`           | INTEGER/REAL | достижения цели / CR (0–1)          |

> **Агрегация по каналу (v2.6.0).** Запрос трафика идёт по одному измерению `ym:s:lastTrafficSource`
> (без дробления на поисковую систему), `attribution=lastsign`. При записи визиты/пользователи/заявки
> суммируются по каналу — одна строка на `(date, channel, utm…)`, поэтому итоги дашборда совпадают с
> Яндекс.Метрикой после re-sync.

### `utm_stats`, `geo_device_stats`, `page_stats`, `exit_page_stats`

Отдельные таблицы для разных разбивок — **намеренно не объединены** с `channel_stats`: суммирование
разных агрегаций задвоило бы визиты. Пропуски измерений нормализуются в `(none)`.

| Таблица            | Уникальные колонки                         | Метрики                                                   |
| ------------------ | ------------------------------------------ | --------------------------------------------------------- |
| `utm_stats`        | `utm_source`, `utm_medium`, `utm_campaign` | visits, users, goal_reaches, conversion_rate              |
| `geo_device_stats` | `country`, `device`                        | visits, users, goal_reaches, conversion_rate              |
| `page_stats`       | `page` (startURL)                          | visits, users, bounce_rate, goal_reaches, conversion_rate |
| `exit_page_stats`  | `page` (exitURL)                           | visits, users, bounce_rate, goal_reaches, conversion_rate |

> ⚠️ `exit_page_stats` на живых данных счётчика ProductCamp часто пуст — `ym:s:exitURL` не
> поддерживается Stat API (это ограничение API, не баг).

---

## Методология

### `hypotheses`

Формат гипотезы «{subject} {action} {solution}, если {condition}» + поля методологии:

| Колонка                                         | Описание                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `id`                                            | PK                                                                 |
| `diamond_phase`                                 | `define` / `develop` (CHECK)                                       |
| `kind`                                          | `problem` / `solution` (CHECK)                                     |
| `subject` / `action` / `solution` / `condition` | компоненты формулировки                                            |
| `title`, `description`                          | заголовок / описание                                               |
| `parent_id`                                     | FK → `hypotheses.id` (solution → problem)                          |
| `hidden_assumptions`                            | JSON, **≥3** допущения в 3 категориях (проверка в репозитории)     |
| `validation_methods`                            | JSON, **≥2** метода проверки                                       |
| `impact` / `confidence` / `ease`                | 1–10 (CHECK) + `*_rationale`                                       |
| `ice_score`                                     | **GENERATED** `impact * confidence * ease` (произведение, ADR-005) |
| `green/yellow/red_criteria`                     | светофор-критерии исхода                                           |
| `deadline_days` / `deadline_at`                 | дедлайн проверки                                                   |
| `evidence`                                      | JSON, прослеживаемость до `raw_responses`                          |
| `status`                                        | draft/in_progress/green/yellow/red/expired (CHECK)                 |
| `created_at` / `updated_at`                     | таймстемпы                                                         |

Индексы: `(diamond_phase, kind, status)`, `(ice_score DESC)`.

### `decisions` (Decision Log)

| Колонка                                          | Описание                                         |
| ------------------------------------------------ | ------------------------------------------------ |
| `id`                                             | PK                                               |
| `number`                                         | UNIQUE, формат `DL-NNN`                          |
| `hypothesis_id`                                  | **FK → `hypotheses.id`**                         |
| `date`                                           | дата решения                                     |
| `method`                                         | synthetic/live/quantitative/market/mixed (CHECK) |
| `scope`, `period_days`                           | охват и период проверки                          |
| `findings`, `evidence`                           | JSON; `evidence` — **≥1** обязательно            |
| `outcome`                                        | green/yellow/red (CHECK)                         |
| `outcome_rationale`                              | обоснование исхода                               |
| `next_step`, `responsible`, `next_deadline`      | следующий шаг                                    |
| `previous_decision_id`, `spawned_hypothesis_ids` | связи итераций                                   |
| `decided_by`, `participants`                     | кто принял решение                               |
| `created_at` / `updated_at`                      | таймстемпы                                       |

Индексы: `(hypothesis_id)`, `(date DESC)`.

### `b2b_manual`

| Колонка                   | Описание                                     |
| ------------------------- | -------------------------------------------- |
| `id`                      | PK                                           |
| `company`                 | компания                                     |
| `tickets`                 | число билетов                                |
| `stage`                   | lead / negotiation / invoiced / paid (CHECK) |
| `amount_rub`              | сумма, ₽ (опц.)                              |
| `contact_email`, `notes`  | контакт / заметки (опц.)                     |
| `date_added`, `date_paid` | даты                                         |

Оплаченные (`stage='paid'`) билеты входят в KPI 300 и в расчёт прогресса «Целей».

### `report_snapshots`

| Колонка                  | Описание                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`                     | PK (ulid)                                                                                                                                                    |
| `generated_at`           | время сборки                                                                                                                                                 |
| `date_from` / `date_to`  | период среза                                                                                                                                                 |
| `payload`                | JSON — весь `ReportSnapshot` (KPI, channels, breakdowns, funnel, b2bSummary, `goalLabel`, опц. `aiNarrative` / `generatedHypotheses` / `generatedDecisions`) |
| `docx_path` / `pdf_path` | пути к сгенерированным файлам (опц.)                                                                                                                         |

Снапшот **неизменяем**: один `id` → один и тот же контент DOCX/PDF/экрана (детерминизм; в render-пути
нет `Date.now()`/LLM). Графики-PNG и AI-нарратив генерируются один раз и читаются из снапшота.

---

## Связи и инварианты

- `decisions.hypothesis_id` → `hypotheses.id` (FK, `foreign_keys=ON`).
- При создании `decision` статус связанной гипотезы атомарно становится `outcome` (green/yellow/red).
- `hypotheses.parent_id` → `hypotheses.id` (solution → problem).
- Гипотеза не сохраняется без формата методологии (≥3 допущения по 3 категориям, ≥2 метода, светофор,
  дедлайн) — `validateHypothesis` из `@pca/shared`.
- `decisions` требует ≥1 evidence.
- KPI-прогресс: оплаты = B2B `paid` **+** достижения цели-покупки из Метрики (когда основная цель —
  `e_purchase`); заявка ≠ оплата для целей-заявок.

---

## Поток данных

```
Stat API → raw_responses (сырьё) → нормализация → channel_stats / utm_stats / geo_device_stats /
page_stats / exit_page_stats  →  SnapshotBuilder → report_snapshots.payload → DOCX/PDF + экран
```

Повторный `pnpm sync` дополняет историю по дням, не затирая прошлые даты. Смена KPI-цели или
исправление единиц требует чистой БД (`rm data/productcamp.sqlite*`) — upsert накапливает, не удаляя
устаревшие строки.
