# Стратегия тестирования (Testing strategy)

> RU primary · [English summary below](#english-summary)

Цель — **100% покрытия логики** и полная пирамида тестов. Тесты поставляются вместе с кодом
в каждой итерации (TDD: red → green → refactor).

## Пирамида

```
        ▲  acceptance  — критерии §14 (Playwright, реальные сценарии)
       ╱ ╲ e2e         — Playwright chromium, backend замокан на сети
      ╱   ╲ component  — Vitest + Testing Library (jsdom)
     ╱     ╲ integration/functional — Vitest (node): repo на SQLite, API через app.inject()
    ╱_______╲ unit     — Vitest (node): чистые функции, аналитика, ICE
```

## Что тестируем на каждом уровне

| Уровень     | Примеры (по мере роста проекта)                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit        | `ice-scorer` (product, границы, сортировка), `traffic-light-evaluator`, `kpi-calculator`, `hypothesis-validator` (≥3 допущения/≥2 метода), zod-схемы Метрики             |
| Integration | репозитории на реальной SQLite (constraint: гипотеза без 3 допущений/2 методов отклоняется), `POST /api/sync` на фикстурах, авто-апдейт статуса гипотезы при создании DL |
| Component   | `HypothesisStructuredEditor`, `ICESlider` (product), блокировка Save без валидаций                                                                                       |
| E2E         | страницы рендерятся; создание гипотезы блокируется; ICE=product; DL → статус; DOCX/PDF < 30с                                                                             |
| Acceptance  | сквозной цикл «гипотеза → DL → статус», прослеживаемость цифр, детерминизм отчёта                                                                                        |

## Команды

```bash
pnpm test       # быстрый прогон (vitest run) по всем пакетам
pnpm coverage   # с порогом 100% (ломает CI при регрессе)
pnpm e2e        # Playwright (поднимает frontend, мокает backend)
```

## Правила

- Порог покрытия 100% (v8). Исключены только bootstrap/entry-файлы (`server.ts`, `main.tsx`,
  `index.ts`, конфиги, тест-харнес) — см. ADR-006.
- Integration > mocks для I/O: бьём по реальной тестовой SQLite, мок только на внешней границе
  (HTTP к Метрике).
- Каждый PR проходит `ci.yml` (lint, typecheck, coverage, build) и `e2e.yml`.

## English summary

Goal: **100% logic coverage** and a full test pyramid, shipped with every iteration (TDD).
Layers: unit (Vitest/node) → integration & functional (Vitest/node: repositories on a real
SQLite, API via `app.inject()`) → component (Vitest + Testing Library/jsdom) → e2e & acceptance
(Playwright chromium, backend mocked at the network layer). Coverage threshold is 100% (v8);
only bootstrap/entry files are excluded (see ADR-006). Run `pnpm test`, `pnpm coverage`, `pnpm e2e`.
