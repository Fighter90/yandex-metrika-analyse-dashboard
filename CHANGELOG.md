# Changelog

Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/);
проект следует [SemVer](https://semver.org/lang/ru/). Коммиты — Conventional Commits;
релиз публикуется по тегу `v*.*.*` (`.github/workflows/release.yml`).

## [Unreleased]

### Added

- Итерация 1 — слой данных: SQLite (`better-sqlite3`), миграции 001–005, runner с трекингом,
  repository pattern (metrics/hypotheses/decisions/b2b/snapshot), общие типы и Voronkova-валидация
  в `@pca/shared`. Гипотеза без ≥3 допущений/≥2 методов отклоняется на уровне репозитория;
  создание Decision Log атомарно обновляет статус гипотезы. CLI `pnpm --filter @pca/backend migrate`.
  100% покрытие (56 unit/integration тестов). ADR-002/007 (SQLite, история по дням).
- Итерация 0 — скелет монорепо (`@pca/backend` Fastify `/api/health`, `@pca/frontend`
  React+Vite+Tailwind, `@pca/shared` ICE_CONFIG), TS strict, ESLint/Prettier, `run.sh`, CI.
- Skill-файлы методологии Воронковой в `.claude/skills/` (с атрибуцией) + заполненный `CLAUDE.md`.
- Документация: README, `docs/` (runbook, user-guide, metrika-api-cheatsheet, testing-strategy), ADR 001/006/007.
- Пирамида тестов с порогом покрытия 100% (Vitest unit/integration/component + Playwright e2e).
- GitHub workflows: `ci.yml` (lint/typecheck/coverage/build), `e2e.yml`, `review.yml` (AI code review), `release.yml`.
- Шаблоны PR и Issue (bug, hypothesis), `dependabot.yml`.

[Unreleased]: https://github.com/Fighter90/metrika_analyse_dashboard/commits/main
