# Структура и назначение проекта

> 🇷🇺 Подробный гид по репозиторию: зачем проект, как устроены папки, что делает каждый файл
> в `.claude/` и `.github/`. Архитектура потока данных — `architecture.md`.

## Назначение проекта

**ProductCamp Conversion Analytics Dashboard** — внутренний локальный инструмент трека
«Конверсии и лидген» ProductCamp. Задача: довести продажи до **KPI 300+ платных билетов**,
разделяя «заявку» и «оплату».

Что делает (всё локально, одной командой `./run.sh`):

1. **Парсит** Яндекс.Метрику (счётчик `<COUNTER_ID>`) по OAuth и кэширует данные в SQLite
   (offline + воспроизводимость, история по дням).
2. **Показывает дашборд**: каналы, воронка визит→заявка→оплата, weak spots, B2B.
3. **Ведёт гипотезы** по методологии проверки гипотез (Double Diamond + ICE = I×C×E) и фиксирует
   решения в Decision Log.
4. **Генерирует DOCX/PDF-отчёт** из неизменяемого snapshot — детерминированно, без выдуманных цифр.

ЦА инструмента — волонтёры и команда трека (часто без backend-опыта): запуск за <10 минут.

## Дерево репозитория

```
.
├── code/
│   ├── backend/      # Fastify API, Metrika-клиент, SQLite, аналитика, отчёты
│   ├── frontend/     # React + Vite дашборд
│   └── shared/       # общие типы, ICE_CONFIG, валидация гипотез (@pca/shared)
├── .claude/skills/   # skill-промпты методологии (см. ниже)
├── .github/          # workflows, шаблоны, CODEOWNERS, dependabot (см. ниже)
├── docs/             # эта документация + ADR (decisions/) + спеки (specs/) + EN-зеркала (en/)
├── data/             # SQLite, отчёты, экспорт DL (gitignored, кроме .gitkeep)
├── CLAUDE.md         # контекст продукта для AI-агентов (system prompt)
├── run.sh            # запуск одной командой
├── CHANGELOG.md      # SemVer + Conventional Commits
└── package.json …    # pnpm workspace (pnpm-workspace.yaml, tsconfig.base.json, eslint.config.js)
```

## Папка `.claude/`

`.claude/skills/` — четыре skill-промпта. Claude Code подгружает их по требованию.

| Файл                                | Назначение                                                                                           |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `skills/hypothesis-check/SKILL.md`  | структурирование problem/solution гипотез + ICE (формат, ≥3 допущения, ≥2 метода, светофор, дедлайн) |
| `skills/synthetic-custdev/SKILL.md` | синтетический CustDev: 5 архетипов ЦА ProductCamp для «разогрева» вопросов                           |
| `skills/market-scan/SKILL.md`       | структурированный рыночный анализ конкурирующих конференций (с источниками)                          |
| `skills/decision-log/SKILL.md`      | шаблон DL-NNN и промпт генерации черновика                                                           |

Методология из `.claude/skills/` не меняется без отметки в
`docs/methodology-hypotheses.md` с reasoning.

## Папка `.github/`

### Workflows (`.github/workflows/`)

| Файл           | Триггер        | Что делает                                                                                                                                                                        |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`       | push main / PR | параллельно: **quality** (ESLint + Prettier-check + typecheck), **test** (coverage, матрица Node 20/22, порог 100%), **build** (артефакт dist), **actionlint**, gate-джоб `ci-ok` |
| `security.yml` | push main / PR | **gitleaks** (секрет-скан, CLI без лицензии) + report-only `pnpm audit`                                                                                                           |
| `e2e.yml`      | push / PR      | Playwright smoke (chromium); отчёт-артефакт при падении                                                                                                                           |
| `pr-lint.yml`  | PR             | заголовок PR в стиле Conventional Commits                                                                                                                                         |
| `review.yml`   | PR             | AI code review (Claude) — пропускается, пока нет секрета `ANTHROPIC_API_KEY`                                                                                                      |
| `release.yml`  | тег `v*.*.*`   | **verify** (полный гейт) → package (app tar.gz + frontend zip + checksums) → публикация GitHub Release                                                                            |

### Прочее в `.github/`

- `CODEOWNERS` — владелец по умолчанию + особый присмотр за `.claude/skills/` и методологией.
- `dependabot.yml` — еженедельные обновления npm + github-actions; **мажорные игнорируются**
  (стек закреплён: Fastify 4, React 18 — мажоры требуют ADR).
- `PULL_REQUEST_TEMPLATE.md` — чек-лист (тесты/типы/линт/доки/ADR/скриншоты/методология).
- `ISSUE_TEMPLATE/bug.md`, `ISSUE_TEMPLATE/hypothesis.md` — последний по структурированному формату гипотезы.

## Корневые конфиги

`pnpm-workspace.yaml` (пакеты `code/*`), `tsconfig.base.json` (strict + `noUncheckedIndexedAccess`),
`eslint.config.js` (flat + typescript-eslint + prettier), `.prettierrc.json` / `.prettierignore`,
`.gitleaks.toml`, `.editorconfig`, `.nvmrc`, `.env.example` (плейсхолдеры; реальный `.env` gitignored).
