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

| Endpoint | Назначение |
|---|---|
| `GET /management/v1/counter/{id}/goals` | seed таблицы `goals` |
| `GET /stat/v1/data` | основные отчёты |
| `GET /stat/v1/data/bytime` | временные ряды |
| `GET /stat/v1/data/drilldown` | drill-down |

## Параметры Stat API (основное)

- `ids` — id счётчика (`54280963`).
- `dimensions` — измерения, напр. `ym:s:lastTrafficSource,ym:s:lastSourceEngine`.
- `metrics` — метрики, напр. `ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:avgVisitDurationSeconds`.
- Цели: `ym:s:goal<ID>reaches`, `ym:s:goal<ID>conversionRate` (подставляется id цели).
- UTM: `ym:s:UTMSource,ym:s:UTMMedium,ym:s:UTMCampaign,ym:s:UTMContent`.
- Поведение: `ym:s:startURL,ym:s:exitURL`.
- Период: `date1`, `date2` (формат `YYYY-MM-DD`).

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
