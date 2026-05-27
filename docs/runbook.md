# Runbook — запуск и эксплуатация

> 🇷🇺 Русский · [🇬🇧 English](en/runbook.md)
> **Текущая версия:** v2.6.0 (2026-05-27)

Подробная инструкция «как запустить проект», в т.ч. для волонтёра без backend-опыта.

## 1. Требования

- **Node.js 20 LTS** (`node -v` → v20.x). Установка: https://nodejs.org или `nvm install 20`.
- **pnpm 9** — поставится автоматически из `run.sh`, либо вручную: `npm i -g pnpm`.
- macOS / Linux. На Windows — через WSL2.

## 2. Первый запуск (одной командой)

```bash
cd metrika_analyse_dashboard
./run.sh
```

Что делает `run.sh` по шагам:

1. Проверяет Node, при отсутствии `pnpm` ставит его.
2. `pnpm install` (если нет `node_modules`).
3. Если нет `.env` — копирует из `.env.example` и просит вписать токен (выходит).
4. Загружает `.env`, прогоняет миграции. Если `YANDEX_OAUTH_TOKEN` **не задан** — наполняет БД
   **демо-данными** (`pnpm seed`), чтобы дашборд сразу был рабочим; если задан — делает реальный `sync`.
5. Запускает `pnpm dev` (backend + frontend) и открывает браузер.

> **Демо-режим без токена.** `pnpm seed` (или `pnpm --filter @pca/backend seed`) кладёт в SQLite
> детерминированный набор примеров (каналы, UTM, гео/девайс, страницы входа/выхода, B2B-сделки, цели).
> Это иллюстративные данные, не из Метрики, — удобно показать инструмент волонтёрам до получения OAuth.

## 3. Настройка `.env`

```bash
cp .env.example .env
```

Заполните:

| Переменная                                  | Значение                                                 |
| ------------------------------------------- | -------------------------------------------------------- |
| `YANDEX_OAUTH_TOKEN`                        | токен `metrika:read` (см. README → «Как получить токен») |
| `YANDEX_CLIENT_ID` / `YANDEX_CLIENT_SECRET` | данные OAuth-приложения                                  |
| `COUNTER_ID`                                | ваш счётчик Метрики (задаётся в `.env`, нужен для sync)  |
| `GOAL_ID`                                   | `0` = авто-определение KPI-цели; `> 0` фиксирует цель    |
| `PORT` / `API_PORT`                         | `5173` / `4000`                                          |
| `ARCHIVED_GOAL_ID_THRESHOLD`                | `77` (цели старше — архивные)                            |
| `LOW_UTM_COVERAGE_RATIO`                    | `0.7` (порог флага низкого покрытия UTM)                 |

`.env` в `.gitignore` — токен и secret никогда не попадают в репозиторий.

## 4. Проверка, что всё поднялось

- Frontend: http://localhost:5173 — карточка «Backend health» должна показать `ok`.
- Backend: `curl http://localhost:4000/api/health` → JSON со `status: "ok"`,
  `counterId` и `metrikaTokenPresent`.

Поле `metrikaTokenPresent: false` означает, что токен ещё не вписан в `.env`.

## 5. Частые команды разработчика

```bash
pnpm dev         # backend + frontend в watch-режиме
pnpm typecheck   # строгая проверка типов
pnpm lint        # ESLint
pnpm test        # Vitest
pnpm build       # сборка (артефакт frontend → code/frontend/dist)
```

## 5a. Экспорт отчётов (DOCX / PDF)

На странице **Report** соберите snapshot и нажмите **Export DOCX** или **Export PDF** —
файл сохраняется в `data/reports/{id}.{docx|pdf}`.

- **DOCX** работает «из коробки», ничего ставить не нужно.
- **PDF** рендерится через `puppeteer-core`, который не скачивает Chromium (чтобы установка и CI были
  быстрыми). Укажите путь к локальному Chrome в `.env`:

  ```bash
  # macOS
  PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  # Linux
  PUPPETEER_EXECUTABLE_PATH="$(which google-chrome || which chromium-browser)"
  ```

  Без валидного `PUPPETEER_EXECUTABLE_PATH` экспорт PDF упадёт — используйте DOCX или установите Chrome.

## 6. Траблшутинг

| Симптом                                    | Причина / решение                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Node.js 20+ required`                     | поставьте Node 20 (`nvm install 20 && nvm use 20`).                                                                                        |
| Браузер открылся, но «Backend недоступен»  | backend ещё стартует — обновите через 2–3 сек; проверьте `API_PORT=4000` свободен.                                                         |
| `metrikaTokenPresent: false`               | впишите `YANDEX_OAUTH_TOKEN` в `.env` и перезапустите.                                                                                     |
| `EADDRINUSE :4000` / `:5173`               | порт занят — поменяйте `API_PORT` / `PORT` в `.env`.                                                                                       |
| `pnpm: command not found`                  | `npm i -g pnpm` (или просто запустите `./run.sh`).                                                                                         |
| Sync упал с ошибкой токена, данные пропали | Начиная с v2.6.0 sync валидирует токен **до** очистки БД — пустая база после ошибки токена невозможна. Проверьте `YANDEX_OAUTH_TOKEN`.     |
| Блок «Страницы выхода» не отображается     | Это ожидаемое поведение: Яндекс.Метрика не отдаёт `ym:s:exitURL` для данного счётчика. Таблица `exit_page_stats` остаётся пустой — не баг. |

## 7. Остановка

`Ctrl+C` в терминале с `run.sh` — завершает backend и frontend.
