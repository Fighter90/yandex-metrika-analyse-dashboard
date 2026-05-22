# ADR-006 — Тестовое окружение и пирамида тестов

- **Статус:** принято
- **Дата:** 2026-05-22
- **Контекст:** требование 100% покрытия и полной пирамиды тестов (unit / functional /
  integration / e2e / acceptance). Спека (§3) фиксирует Vitest + Playwright.

## Решение

Пирамида:

| Уровень                  | Инструмент                       | Где                                                        |
| ------------------------ | -------------------------------- | ---------------------------------------------------------- |
| Unit                     | Vitest (node)                    | чистые функции, константы, аналитика (`ice-scorer` и т.п.) |
| Integration / functional | Vitest (node)                    | репозитории на реальной SQLite, API через `app.inject()`   |
| Component                | Vitest (jsdom) + Testing Library | React-компоненты, валидации форм гипотез                   |
| E2E / acceptance         | Playwright (chromium)            | пользовательские сценарии, критерии §14                    |

Доп. dev-инструменты (в рамках строки «Tests | Vitest + Playwright» спеки):
`@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.

Покрытие: провайдер v8, **порог 100%** (lines/branches/functions/statements). Из покрытия
исключены только bootstrap/entry-файлы без логики: `backend/src/server.ts`, `frontend/src/main.tsx`,
`shared/src/index.ts`, тест-харнес и `*.config.*`.

## Обоснование

- Тестируемость заложена в код: `buildServer()` вынесен в `app.ts` (без `listen`), чистые
  функции (`hasMetrikaToken`) принимают аргумент — это даёт 100% без хаков.
- E2E мокает backend на сетевом уровне (`page.route`) → детерминированно, без OAuth-токена.

## Последствия

- CI гоняет `pnpm coverage` (а не просто `pnpm test`) — пороги ломают сборку при регрессе.
- E2E требует `playwright install chromium` (в CI — `--with-deps`).
- Каждая будущая итерация поставляется с тестами своего уровня (TDD), иначе coverage упадёт <100%.
