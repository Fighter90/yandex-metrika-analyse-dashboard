# Быстрый старт и развёртывание

> 🇷🇺 Русский. Как развернуть ProductCamp Conversion Analytics Tool локально с нуля.
> Инструмент работает **только локально** (без облака): парсит Яндекс.Метрику → SQLite → дашборд →
> DOCX/PDF. Глубокие операции и отладка — в [runbook.md](runbook.md); пользование — в
> [user-guide.md](user-guide.md).

---

## 1. Требования

| Что           | Версия | Проверка                                            |
| ------------- | ------ | --------------------------------------------------- |
| Node.js       | ≥ 20   | `node --version`                                    |
| pnpm          | ≥ 9    | `pnpm --version`                                    |
| Git           | любая  | `git --version`                                     |
| Google Chrome | любая  | нужен **только** для экспорта PDF (DOCX — без него) |

- ОС: macOS / Linux / Windows. `./setup.sh`, `./init.sh`, `./run.sh` — bash-скрипты (на Windows
  запускайте через WSL/Git Bash либо выполняйте шаги вручную, см. §4).
- Доступ к Яндекс.Метрике со scope `metrika:read` — нужен **только для живых данных**. Без токена
  дашборд поднимется на демо-данных.
- `ANTHROPIC_API_KEY` — нужен **только** для AI-анализа отчёта. Без него дашборд и отчёты работают.

---

## 2. Установка одной командой

```bash
git clone git@github.com:Fighter90/metrika_analyse_dashboard.git
cd metrika_analyse_dashboard
./setup.sh
```

`./setup.sh` последовательно выполняет три шага: **install → init → start**. Когда нужен контроль на
каждом шаге — выполняйте их по отдельности (§3).

После старта откроется:

- **Дашборд:** <http://localhost:5173>
- **API:** <http://localhost:4000> (проксируется фронтендом как `/api`)
- **Swagger:** <http://localhost:4000/docs>

---

## 3. По шагам (install → init → start)

```bash
pnpm install        # 1. зависимости (pnpm workspace: backend / frontend / shared)
./init.sh           # 2. интерактивно создаёт .env (Anthropic key + параметры Метрики + опц. OAuth)
./run.sh            # 3. миграции → sync (или demo-seed без токена) → дашборд
```

**Шаг 2 — `./init.sh`** создаёт `.env` из `.env.example` и спрашивает:

1. `ANTHROPIC_API_KEY` — ключ для AI-анализа (можно пропустить);
2. `COUNTER_ID` — ID счётчика Яндекс.Метрики (нужен для живого sync);
3. `GOAL_ID` — id цели KPI: `0` = **авто-определение** основной цели оплаты/покупки, `> 0` —
   зафиксировать конкретную цель;
4. предложит сразу настроить OAuth (`pnpm auth`).

`./init.sh` не затирает уже заданные переменные `.env`.

**Шаг 3 — `./run.sh`** ставит pnpm при отсутствии, прогоняет миграции, затем:

- если `YANDEX_OAUTH_TOKEN` задан → `pnpm sync` (при `GOAL_ID=0` цель определяется автоматически,
  иначе передаётся `--goalId=$GOAL_ID`);
- иначе → `pnpm seed` (детерминированные демо-данные);
- поднимает backend + frontend (`pnpm dev`) и открывает браузер.

---

## 4. Переменные окружения (`.env`)

Хранятся **только** в `.env` (он в `.gitignore`) — никогда не коммитьте. Шаблон — `.env.example`
(только плейсхолдеры).

| Переменная                  | Обязательна             | Назначение                                                       |
| --------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `COUNTER_ID`                | для живого sync         | ID счётчика Яндекс.Метрики                                       |
| `YANDEX_OAUTH_TOKEN`        | для живого sync         | OAuth-токен (scope `metrika:read`); получается через `pnpm auth` |
| `YANDEX_CLIENT_ID`          | для `pnpm auth`         | Client ID приложения Яндекс ID                                   |
| `YANDEX_CLIENT_SECRET`      | для `pnpm auth`         | Client secret приложения Яндекс ID                               |
| `GOAL_ID`                   | нет (по умолч. `0`)     | `0` = авто-определение KPI-цели; `> 0` = фиксированная цель      |
| `ANTHROPIC_API_KEY`         | для AI-анализа          | ключ Anthropic                                                   |
| `ANTHROPIC_MODEL`           | нет                     | модель Claude (по умолчанию — актуальная sonnet)                 |
| `PUPPETEER_EXECUTABLE_PATH` | для PDF, если не найден | путь к Chrome, если авто-поиск не сработал                       |
| `PORT`                      | нет                     | порт фронтенда (по умолчанию 5173)                               |

> Конфигурацию также можно править в UI: страница **Настройки** пишет значения в `.env` (секреты
> маскируются и не отправляются обратно при сохранении).

---

## 5. Получение `YANDEX_OAUTH_TOKEN`

Нужен токен со scope `metrika:read`. Документация: <https://yandex.ru/dev/id/doc/ru/>.

**Способ 1 (рекомендуется) — `pnpm auth`** (authorization-code flow, использует Client ID/Secret из `.env`):

```bash
pnpm auth
```

1. Помощник печатает ссылку авторизации (`response_type=code`) — откройте и подтвердите доступ.
2. Скопируйте **код подтверждения** и вставьте в терминал.
3. Помощник обменяет код на токен (`POST https://oauth.yandex.ru/token`) и сам впишет
   `YANDEX_OAUTH_TOKEN` в `.env`. Дальше — `pnpm sync` (или `./run.sh`).

**Способ 2 (вручную) — implicit flow:**

1. Откройте `https://oauth.yandex.ru/authorize?response_type=token&client_id=<YANDEX_CLIENT_ID>`.
2. Подтвердите доступ; токен вернётся в URL после `#access_token=...`.
3. Впишите его в `.env` → `YANDEX_OAUTH_TOKEN=...`.

---

## 6. Демо-режим (без токена)

Без `YANDEX_OAUTH_TOKEN` инструмент наполняется детерминированными демо-данными:

```bash
pnpm seed        # положить демо-данные в SQLite
pnpm dev         # поднять дашборд
```

`./run.sh` делает это автоматически, если токен не задан. Удобно показать инструмент сразу, без OAuth.

---

## 7. Проверка, что всё поднялось

```bash
curl -s http://localhost:4000/api/health        # {"status":"ok", ...}
curl -s "http://localhost:4000/api/metrics/channels?from=2026-05-13&to=2026-05-27" | head -c 200
open http://localhost:5173                       # дашборд (на Linux: xdg-open)
```

Здоровый ответ `/api/health` содержит `status: "ok"`, `counterId`, `metrikaTokenPresent`.

---

## 8. Перезапуск / переразвёртывание

```bash
# 1. Остановить запущенные процессы dev-стека
pkill -f "tsx watch src/server.ts"; pkill -f "vite"
# 2. (опц.) применить миграции, если обновляли код
pnpm --filter @pca/backend migrate
# 3. Поднять заново
pnpm dev
```

Стек идемпотентен: повторный `./run.sh` безопасен. Повторный `pnpm sync` **дополняет** историю по
дням, не затирая прошлые данные.

---

## 9. Чистая база

```bash
rm data/productcamp.sqlite*                  # удалить БД (gitignored)
pnpm --filter @pca/backend migrate           # применить миграции 001..009 заново
pnpm seed   # или: pnpm --filter @pca/backend sync --goalId=<id> --from=YYYY-MM-DD --to=YYYY-MM-DD
```

> Чистая БД нужна при **смене KPI-цели** или исправлении единиц измерения: upsert накапливает строки
> и не удаляет устаревшие.

---

## 10. Типичные проблемы развёртывания

| Симптом                                   | Решение                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Node.js 20+ required`                    | установите Node ≥ 20 (`node --version`)                                                    |
| `pnpm: command not found`                 | `npm i -g pnpm` (или `corepack enable`)                                                    |
| Порт 5173/4000 занят                      | остановите старые процессы (`pkill -f vite`, `pkill -f "tsx watch src/server.ts"`)         |
| PDF: `executablePath … must be specified` | задайте `PUPPETEER_EXECUTABLE_PATH` в `.env` или установите Chrome                         |
| Пустой дашборд                            | нет данных: проверьте `COUNTER_ID`/`YANDEX_OAUTH_TOKEN` или используйте демо (`pnpm seed`) |
| `ENOSPC` при генерации отчётов            | освободите место на диске (отчёты + Chrome пишут во временные файлы)                       |

Подробная диагностика и операционные сценарии — в [runbook.md](runbook.md).

---

## 11. Качество и проверки (для разработчиков)

```bash
pnpm -r typecheck && pnpm lint && pnpm format:check && pnpm -r coverage && pnpm build
pnpm exec playwright test          # e2e: desktop + mobile-iphone-14
```

Порог покрытия — **100%** (entry/bootstrap и браузерные рендереры исключены, см.
[testing-strategy.md](testing-strategy.md)). Версии в шапках доков синхронизируются
`pnpm sync-versions` (+ committed pre-commit хук).
