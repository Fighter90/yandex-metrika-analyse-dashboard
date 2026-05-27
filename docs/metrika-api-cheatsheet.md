# Яндекс.Метрика API — шпаргалка

Рабочая выжимка для интеграции (детальная реализация — итерация 2).

## Документация

- Обзор API Метрики: https://yandex.ru/dev/metrika/ru/
- Авторизация / Яндекс ID (OAuth): https://yandex.ru/dev/id/doc/ru/

## OAuth

- Заголовок запросов: `Authorization: OAuth <token>` (именно слово `OAuth`, не `Bearer`).
- Scope: `metrika:read`.
- Получение токена (implicit flow):
  `https://oauth.yandex.ru/authorize?response_type=token&client_id=<CLIENT_ID>` →
  токен в URL-фрагменте `#access_token=...`.
- Redirect URI приложения: `https://oauth.yandex.ru/verification_code`.

## Базовый URL и эндпоинты

Base URL: `https://api-metrika.yandex.net`

| Endpoint                                | Назначение           |
| --------------------------------------- | -------------------- |
| `GET /management/v1/counter/{id}/goals` | seed таблицы `goals` |
| `GET /stat/v1/data`                     | основные отчёты      |
| `GET /stat/v1/data/bytime`              | временные ряды       |
| `GET /stat/v1/data/drilldown`           | drill-down           |

## Параметры Stat API (основное)

- `ids` — id счётчика (`<COUNTER_ID>`).
- `dimensions` — измерения, напр. `ym:s:lastTrafficSource,ym:s:lastSourceEngine`.
- `metrics` — метрики, напр. `ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:avgVisitDurationSeconds`.
- Цели: `ym:s:goal<ID>reaches`, `ym:s:goal<ID>conversionRate` (подставляется id цели).
- UTM: `ym:s:UTMSource,ym:s:UTMMedium,ym:s:UTMCampaign,ym:s:UTMContent`.
- Поведение: `ym:s:startURL,ym:s:exitURL`.
- Период: `date1`, `date2` (формат `YYYY-MM-DD`).
- Атрибуция: все запросы передают `attribution=lastsign` (последний значимый источник) — чтобы цифры
  совпадали с интерфейсом Метрики, где по умолчанию выбрана модель «LastSign».

> **Атрибуция и cross-device.** Запросы фиксируют `attribution=lastsign`, поэтому визиты/заявки по
> каналам совпадают с отчётом Метрики в режиме «LastSign». Интерфейс Метрики дополнительно умеет
> межсессионную склейку устройств (`isCrossDevice`), которой в Stat API без cross-device-модели нет;
> из-за этого возможны небольшие расхождения по уникальным пользователям. Это ожидаемо: для точной
> сверки выбирайте в Метрике LastSign **без** cross-device.

> **Известное ограничение — страницы выхода (`ym:s:exitURL`).** Для счётчика ProductCamp
> Stat API отклоняет запросы с измерением `ym:s:exitURL` (400 invalid attribute), поэтому
> таблица `exit_page_stats` остаётся пустой, а синк помечает блок exit-pages как best-effort
> и пропускает его (см. `SyncService.best()` в `src/metrika/sync-service.ts`). На дашборде
> блок «Страницы выхода» и соответствующий график при отсутствии данных скрываются;
> в подписи графика это указано явно. Это не баг и не потеря данных — измерение недоступно
> на стороне Метрики. Для путей выхода по пользователям нужен Logs API (вне scope, см. ADR-002).

## Ограничения и правила клиента (наша реализация — итерация 2)

- Rate limit: ~1000 запросов/час → token-bucket лимитер.
- Retry: экспоненциальный backoff с jitter на 429/5xx, до 5 попыток.
- Период > 7 дней разбиваем на дневные чанки.
- Все ответы валидируются Zod; при несовпадении — `MetrikaSchemaError` + дамп в `data/errors/`.
- Логи через pino — **без токена**.
- Каждый сырой ответ сохраняется в `raw_responses` (для прослеживаемости цифр).

## Архивация целей

`goals.is_archived = 1`, если `id < ARCHIVED_GOAL_ID_THRESHOLD` (по умолчанию 77).
В UI — тогл «показать архивные», по умолчанию выключен.
