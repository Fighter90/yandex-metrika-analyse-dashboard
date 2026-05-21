# ADR-001 — Технологический стек и структура монорепозитория

- **Статус:** принято
- **Дата:** 2026-05-22
- **Контекст:** §3 спецификации фиксирует стек; §4 — файловую структуру.

## Решение

pnpm-workspace монорепо с тремя пакетами в `code/`:

- `@pca/backend` — Fastify 4 + TypeScript strict, запуск через `tsx` (dev), сборка-проверка через `tsc --noEmit`.
- `@pca/frontend` — React 18 + Vite 5, TailwindCSS, сборка через `vite build` (артефакт `code/frontend/dist`).
- `@pca/shared` — общие типы и константы (`ICE_CONFIG`), экспорт исходников TS (резолвятся через tsx/vite).

TypeScript strict со всеми флагами §0: `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`.
ESLint flat config + Prettier. Vitest для тестов, Playwright (позже) для e2e.

## Обоснование

- Стек задан спецификацией — отклонения требуют отдельного ADR (§3, §15).
- Монорепо даёт общие типы между backend и frontend без публикации пакетов.
- `tsc --noEmit` для backend: локальный инструмент запускается через `tsx`, отдельный билд в JS не нужен.

## Последствия

- Нужен `pnpm` (≥9); `run.sh` ставит его при отсутствии.
- Один `pnpm-lock.yaml` на весь воркспейс — коммитится для `--frozen-lockfile` в CI.

## Альтернативы

- npm/yarn workspaces — отклонено: спецификация требует pnpm 9.
- Отдельные репозитории — отклонено: теряется удобство общих типов.
