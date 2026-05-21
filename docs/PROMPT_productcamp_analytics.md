# Промпт: ProductCamp Conversion Analytics Dashboard

> **Как использовать.** Скопируй весь документ в Claude Code как первое сообщение. Это полная project spec.
> К промпту прилагаются файлы из директории `skills/` (см. рядом) — их нужно положить в репозиторий в `.claude/skills/`. Они задают методологию работы с гипотезами и адаптированы под ProductCamp-домен.

---

## 0. Роль и режим работы

Ты — senior full-stack TypeScript-инженер с 10+ лет опыта продуктовой аналитики. Работаешь автономно, инкрементально, с короткими feedback-loop'ами.

**Жёсткие правила:**

1. **Никаких выдуманных цифр.** Все числа в дашборде и отчёте прослеживаемы до конкретного API-ответа Яндекс.Метрики, сохранённого в SQLite.
2. **Воспроизводимость.** Один и тот же `snapshotId` → байт-идентичные DOCX и PDF.
3. **TypeScript strict.** `noUncheckedIndexedAccess: true`, никаких `any` без `// FIXME:`.
4. **Методология гипотез — обязательна** (см. §8, §9 и `.claude/skills/`). Гипотеза без структурного формата, скрытых допущений, методов проверки, светофор-критериев и дедлайна — невалидна и не сохраняется в БД.
5. **Decision Log замыкает цикл.** Каждая проверенная гипотеза → запись в `decisions`. Без записи решение считается не принятым.
6. Документируй архитектурные решения в `docs/decisions/NNN-*.md`.

---

## 1. Бизнес-контекст (зашит, не выдумывать)

Внутренний аналитический инструмент для **трека «Конверсии и лидген» ProductCamp**. До старта — меньше 3 недель, до основной работы — меньше 2.

**KPI:** 300+ платных билетов.

**Текущая ситуация:**
- Фактически закрыто ~150 билетов (B2C онлайн + B2B пачками).
- Динамика: вчера 7 оплат, сегодня 9–10, раньше единичные.
- Цели в Метрике формально перевыполнены (>300 заявок), но **заявка ≠ оплата**.

**Особенности данных:**
- В счётчике **123 цели**, актуальные с **~77-й**. Старше — `is_archived = 1` (порог конфигурируем).
- **B2C** — основной фокус Метрики.
- **B2B** — отдельная таблица с ручным вводом: ~3 крупные компании по 15–20 билетов + 2–3 по 3–5. Одна заявка может означать 10+ билетов.
- **UTM-разметка неравномерная** — сегменты с покрытием < 70% помечаются флагом `low_utm_coverage`.
- **3 посадочных страницы**: старая регистрация, новая основная, новая «билет + проживание».
- **Волонтёрская регистрация** — игнорировать.

**Каналы для разбивки**: подкаст, инфопартнёры, амбассадоры, рефералки, контент, прямой, поиск.

---

## 2. Цель проекта

Локально запускаемый инструмент, который:

1. По OAuth подключается к **Яндекс.Метрике** (счётчик `54280963`) через Reporting API.
2. Кэширует данные в **SQLite** (offline + воспроизводимость).
3. Поднимает **интерактивный дашборд** в браузере (графики, фильтры, таблицы, drill-down).
4. Позволяет формулировать гипотезы **по методологии Воронковой** (см. `.claude/skills/hypothesis-check/SKILL.md`), оценивать по **ICE = I × C × E**, привязывать к данным Метрики, проверять и записывать в **Decision Log**.
5. Применяет **Double Diamond** на верхнем уровне процесса, методологию Воронковой — внутри фаз Define/Develop.
6. Генерирует **DOCX и PDF отчёт** строго из immutable snapshot.
7. Запускается одной командой: `./run.sh`.
8. Хостится в GitHub с README, CLAUDE.md, `.claude/skills/`, GitHub Actions.

---

## 3. Технологический стек (фиксированный)

| Слой | Технология |
|---|---|
| Runtime | Node.js 20 LTS |
| Язык | TypeScript 5, strict |
| Backend | Fastify 4 |
| Validation | Zod |
| HTTP | undici (built-in fetch) |
| Storage | SQLite via `better-sqlite3` |
| Frontend | React 18 + Vite 5 |
| UI | TailwindCSS + shadcn/ui |
| Charts | Apache ECharts (`echarts-for-react`) |
| Tables | TanStack Table v8 |
| State | Zustand + TanStack Query |
| DOCX | `docx` (dolanmiu/docx) |
| PDF | Puppeteer (рендер той же HTML-страницы превью) |
| Dates | `date-fns` + `date-fns-tz` (Europe/Moscow) |
| Tests | Vitest + Playwright |
| Lint | ESLint + Prettier |
| PM | pnpm 9 |

**Запрещено** добавлять зависимости вне списка без ADR в `docs/decisions/`.

---

## 4. Файловая структура

```
productcamp-analytics/
├── README.md                          # инструкция, методология, quickstart
├── CLAUDE.md                          # контекст продукта по шаблону Воронковой
├── .claude/
│   └── skills/                        # ← skill-промпты, копируются из выданных файлов
│       ├── hypothesis-check/
│       │   └── SKILL.md
│       ├── synthetic-custdev/
│       │   └── SKILL.md
│       ├── market-scan/
│       │   └── SKILL.md
│       └── decision-log/
│           └── SKILL.md
├── .env.example
├── .gitignore
├── .editorconfig
├── .nvmrc
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── run.sh
├── scripts/
│   ├── bootstrap.sh
│   ├── fetch-metrika.ts
│   ├── refresh-cache.ts
│   ├── generate-report.ts
│   └── new-decision.ts                # CLI: создать черновик DL по шаблону
├── code/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── config.ts
│   │   │   ├── routes/
│   │   │   │   ├── health.ts
│   │   │   │   ├── metrics.ts
│   │   │   │   ├── hypotheses.ts
│   │   │   │   ├── decisions.ts       # CRUD Decision Log
│   │   │   │   ├── b2b.ts
│   │   │   │   ├── report.ts
│   │   │   │   └── sync.ts
│   │   │   ├── metrika/
│   │   │   │   ├── client.ts
│   │   │   │   ├── endpoints.ts
│   │   │   │   ├── schemas.ts
│   │   │   │   └── queries/
│   │   │   │       ├── traffic-by-source.ts
│   │   │   │       ├── conversion-funnel.ts
│   │   │   │       ├── utm-breakdown.ts
│   │   │   │       ├── page-behavior.ts
│   │   │   │       ├── form-dropoff.ts
│   │   │   │       └── geo-device.ts
│   │   │   ├── db/
│   │   │   │   ├── connection.ts
│   │   │   │   ├── migrations/
│   │   │   │   │   ├── 001_init.sql
│   │   │   │   │   ├── 002_hypotheses.sql
│   │   │   │   │   ├── 003_b2b_manual.sql
│   │   │   │   │   ├── 004_snapshots.sql
│   │   │   │   │   └── 005_decisions.sql
│   │   │   │   ├── repositories/
│   │   │   │   │   ├── metrics-repo.ts
│   │   │   │   │   ├── hypotheses-repo.ts
│   │   │   │   │   ├── decisions-repo.ts
│   │   │   │   │   ├── b2b-repo.ts
│   │   │   │   │   └── snapshot-repo.ts
│   │   │   │   └── seed/
│   │   │   │       └── goals.ts
│   │   │   ├── analytics/
│   │   │   │   ├── kpi-calculator.ts
│   │   │   │   ├── channel-quality.ts
│   │   │   │   ├── funnel-builder.ts
│   │   │   │   ├── ice-scorer.ts          # ICE = I × C × E
│   │   │   │   ├── hypothesis-validator.ts
│   │   │   │   └── traffic-light-evaluator.ts   # сопоставляет evidence с green/yellow/red критериями
│   │   │   ├── report/
│   │   │   │   ├── snapshot-builder.ts
│   │   │   │   ├── docx/
│   │   │   │   │   ├── builder.ts
│   │   │   │   │   ├── sections/
│   │   │   │   │   │   ├── cover.ts
│   │   │   │   │   │   ├── executive-summary.ts
│   │   │   │   │   │   ├── methodology.ts
│   │   │   │   │   │   ├── discover.ts
│   │   │   │   │   │   ├── define.ts        # problem hypotheses с полным шаблоном Воронковой
│   │   │   │   │   │   ├── develop.ts       # solution hypotheses
│   │   │   │   │   │   ├── deliver.ts       # action plan + decision log за период
│   │   │   │   │   │   └── data-appendix.ts
│   │   │   │   │   └── styles.ts
│   │   │   │   └── pdf/
│   │   │   │       ├── renderer.ts
│   │   │   │       └── print-stylesheet.css
│   │   │   └── utils/
│   │   │       ├── logger.ts
│   │   │       ├── rate-limiter.ts
│   │   │       └── retry.ts
│   │   └── tests/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── routes/
│   │   │   │   ├── overview.tsx
│   │   │   │   ├── traffic.tsx
│   │   │   │   ├── funnel.tsx
│   │   │   │   ├── behavior.tsx
│   │   │   │   ├── forms.tsx
│   │   │   │   ├── b2b.tsx
│   │   │   │   ├── hypotheses.tsx
│   │   │   │   ├── decisions.tsx         # Decision Log UI
│   │   │   │   └── report-preview.tsx
│   │   │   ├── components/
│   │   │   │   ├── charts/...
│   │   │   │   ├── tables/...
│   │   │   │   ├── filters/...
│   │   │   │   ├── hypotheses/
│   │   │   │   │   ├── DoubleDiamondCanvas.tsx
│   │   │   │   │   ├── HypothesisStructuredEditor.tsx   # формат Воронковой
│   │   │   │   │   ├── HiddenAssumptionsList.tsx
│   │   │   │   │   ├── ValidationMethodsList.tsx
│   │   │   │   │   ├── TrafficLightCriteria.tsx
│   │   │   │   │   ├── ICESlider.tsx                    # I × C × E
│   │   │   │   │   ├── DataEvidencePanel.tsx
│   │   │   │   │   └── DeadlineCountdown.tsx
│   │   │   │   ├── decisions/
│   │   │   │   │   ├── DecisionLogList.tsx
│   │   │   │   │   ├── DecisionEditor.tsx               # по шаблону DL-{N}
│   │   │   │   │   └── DecisionTimeline.tsx
│   │   │   │   └── ui/...
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types/
│   │   ├── vite.config.ts
│   │   └── tailwind.config.ts
│   └── shared/
│       └── src/
│           ├── types/
│           │   ├── metrics.ts
│           │   ├── hypotheses.ts
│           │   ├── decisions.ts
│           │   └── report.ts
│           └── constants.ts
├── docs/
│   ├── architecture.md
│   ├── metrika-api-cheatsheet.md
│   ├── data-model.md
│   ├── methodology-double-diamond.md
│   ├── methodology-hypothesis-voronik.md  # описание методологии + ссылка на оригинал
│   ├── methodology-ice.md                 # I × C × E, anchor examples
│   ├── anti-hallucination.md
│   ├── runbook.md
│   └── decisions/                         # ADR (архитектурные, не путать с DL)
│       ├── 001-tech-stack.md
│       ├── 002-sqlite-vs-postgres.md
│       ├── 003-pdf-via-puppeteer.md
│       ├── 004-b2b-manual-entry.md
│       └── 005-ice-product-vs-mean.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── e2e.yml
│   │   └── release.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug.md
│   │   └── hypothesis.md                  # шаблон по Воронковой
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
└── data/                                  # gitignored
    ├── productcamp.sqlite
    ├── reports/
    │   └── .gitkeep
    └── decisions/                         # экспорт DL в markdown для git-tracking
        └── .gitkeep
```

---

## 5. OAuth-интеграция с Яндекс.Метрикой

### 5.1. Получение токена

`.env`:
```
YANDEX_OAUTH_TOKEN=<токен>
COUNTER_ID=54280963
TIMEZONE=Europe/Moscow
PORT=5173
API_PORT=4000
ARCHIVED_GOAL_ID_THRESHOLD=77
LOW_UTM_COVERAGE_RATIO=0.7
```

Токен — через https://oauth.yandex.ru, scope `metrika:read`. Пошаговая инструкция в README.

### 5.2. Клиент `code/backend/src/metrika/client.ts`

- Заголовок `Authorization: OAuth ${token}` (именно `OAuth`).
- Base URL: `https://api-metrika.yandex.net`.
- Все ответы — Zod-валидация; при несовпадении бросаем `MetrikaSchemaError` с дампом в `data/errors/`.
- Rate limit: 1000 req/час, token-bucket лимитер.
- Retry: экспоненциальный backoff на 429/5xx, max 5 попыток, jitter.
- Логи через `pino` без токена.
- Запросы за период > 7 дней разбиваем на дневные чанки.

### 5.3. Используемые эндпоинты

| Endpoint | Назначение |
|---|---|
| `GET /management/v1/counter/{id}/goals` | seed таблицы `goals` |
| `GET /stat/v1/data` | основные отчёты |
| `GET /stat/v1/data/bytime` | временные ряды |
| `GET /stat/v1/data/drilldown` | drill-down |

### 5.4. Наборы запросов (`metrika/queries/`)

Каждый — типизированная функция:
```ts
export async function trafficBySource(opts: {
  from: Date; to: Date; goalIds?: number[];
}): Promise<ChannelStats[]>
```

Минимум:

1. **traffic-by-source**: dimensions `ym:s:lastTrafficSource,ym:s:lastSourceEngine`; metrics `ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:avgVisitDurationSeconds,ym:s:goal<ID>reaches,ym:s:goal<ID>conversionRate`.
2. **utm-breakdown**: `ym:s:UTMSource,ym:s:UTMMedium,ym:s:UTMCampaign,ym:s:UTMContent` + флаг покрытия.
3. **conversion-funnel**: визит → страница регистрации → форма started → submitted → оплата.
4. **page-behavior**: `ym:s:startURL,ym:s:exitURL` + bounce/duration.
5. **form-dropoff**: события focus/blur/submit (если настроены).
6. **geo-device**: city/device/browser.
7. **time-series**: bytime для line-чартов и heatmap.

### 5.5. Архивация целей

`goals.is_archived = 1` если `id < ARCHIVED_GOAL_ID_THRESHOLD`. UI-тогл «показать архивные», default off.

---

## 6. Слой данных (SQLite)

### 6.1. Схема

```sql
-- 001_init.sql
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  is_b2b BOOLEAN DEFAULT 0,
  is_archived BOOLEAN DEFAULT 0,
  synced_at TEXT NOT NULL
);

CREATE TABLE raw_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL,
  query_hash TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  payload JSON NOT NULL,
  fetched_at TEXT NOT NULL,
  UNIQUE(query_hash, date_from, date_to)
);
CREATE INDEX idx_raw_query ON raw_responses(query_hash, date_from);

CREATE TABLE channel_stats (
  date TEXT NOT NULL,
  channel TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  visits INTEGER NOT NULL,
  users INTEGER NOT NULL,
  bounce_rate REAL NOT NULL,
  avg_duration REAL NOT NULL,
  goal_reaches INTEGER NOT NULL,
  conversion_rate REAL NOT NULL,
  PRIMARY KEY (date, channel, utm_source, utm_medium, utm_campaign)
);

-- 002_hypotheses.sql — формат по Воронковой
CREATE TABLE hypotheses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  diamond_phase TEXT NOT NULL CHECK(diamond_phase IN ('define','develop')),
  kind TEXT NOT NULL CHECK(kind IN ('problem','solution')),

  -- Структурный формат гипотезы (skill-hypothesis-check.md)
  -- «{subject} {action} {solution}, если {condition}»
  subject TEXT NOT NULL,        -- ЦА: "посетитель landing-page", "продакт из B2B-компании"
  action TEXT NOT NULL,         -- "готов купить билет" / "переключится с конкурента" / "оставит email"
  solution TEXT NOT NULL,       -- что предлагаем
  condition TEXT NOT NULL,      -- условие истинности (без него — гипотеза неполная)

  -- Свободный текст для краткого summary и описания (для UI)
  title TEXT NOT NULL,
  description TEXT,

  parent_id INTEGER REFERENCES hypotheses(id),  -- solution → problem

  -- Скрытые допущения (минимум 3: поведение, рынок, технология)
  hidden_assumptions JSON NOT NULL,             -- [{category:'behavior'|'market'|'tech', text:'...'}]

  -- Способы проверки (минимум 2)
  validation_methods JSON NOT NULL,             -- [{type:'synthetic'|'live'|'quantitative'|'market', plan:'...', cost:'...'}]

  -- ICE (формула: product, I*C*E, диапазон 1-1000)
  impact INTEGER NOT NULL CHECK(impact BETWEEN 1 AND 10),
  confidence INTEGER NOT NULL CHECK(confidence BETWEEN 1 AND 10),
  ease INTEGER NOT NULL CHECK(ease BETWEEN 1 AND 10),
  impact_rationale TEXT NOT NULL,               -- одна строка обоснования
  confidence_rationale TEXT NOT NULL,
  ease_rationale TEXT NOT NULL,
  ice_score INTEGER GENERATED ALWAYS AS (impact * confidence * ease) STORED,

  -- Светофор-критерии (skill-hypothesis-check.md)
  green_criteria TEXT NOT NULL,                 -- "3 из 5 респондентов..."
  yellow_criteria TEXT NOT NULL,
  red_criteria TEXT NOT NULL,

  -- Дедлайн проверки
  deadline_days INTEGER NOT NULL,
  deadline_at TEXT NOT NULL,                    -- created_at + deadline_days

  -- Привязка к данным Метрики
  evidence JSON,                                 -- [{type, raw_response_id, slice, note}]

  status TEXT NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','in_progress','green','yellow','red','expired')),

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_hyp_phase ON hypotheses(diamond_phase, kind, status);
CREATE INDEX idx_hyp_ice ON hypotheses(ice_score DESC);

-- 003_b2b_manual.sql
CREATE TABLE b2b_manual (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company TEXT NOT NULL,
  tickets INTEGER NOT NULL,
  stage TEXT NOT NULL CHECK(stage IN ('lead','negotiation','invoiced','paid')),
  amount_rub REAL,
  contact_email TEXT,
  notes TEXT,
  date_added TEXT NOT NULL,
  date_paid TEXT
);

-- 004_snapshots.sql
CREATE TABLE report_snapshots (
  id TEXT PRIMARY KEY,            -- ulid
  generated_at TEXT NOT NULL,
  date_from TEXT NOT NULL,
  date_to TEXT NOT NULL,
  payload JSON NOT NULL,
  docx_path TEXT,
  pdf_path TEXT
);

-- 005_decisions.sql — Decision Log (skill-decision-log.md)
CREATE TABLE decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,              -- "DL-001"
  hypothesis_id INTEGER NOT NULL REFERENCES hypotheses(id),
  date TEXT NOT NULL,

  -- "Что проверяли"
  method TEXT NOT NULL CHECK(method IN ('synthetic','live','quantitative','market','mixed')),
  scope TEXT NOT NULL,                      -- объём: "5 интервью" / "анализ 12000 сессий"
  period_days INTEGER NOT NULL,

  -- "Что узнали" — 3-5 пунктов
  findings JSON NOT NULL,                   -- [{text:'...', confidence:'high|medium|low'}]

  -- "Цитаты / данные" — доказательная база
  evidence JSON NOT NULL,                   -- [{quote:'...', source:'...', raw_response_id:N}]

  -- Решение по светофору
  outcome TEXT NOT NULL CHECK(outcome IN ('green','yellow','red')),
  outcome_rationale TEXT NOT NULL,

  -- Что делаем дальше
  next_step TEXT NOT NULL,
  responsible TEXT,
  next_deadline TEXT,

  -- Связи
  previous_decision_id INTEGER REFERENCES decisions(id),
  spawned_hypothesis_ids JSON,              -- [id, id, ...] — гипотезы, родившиеся отсюда

  -- Авторство
  decided_by TEXT NOT NULL,
  participants TEXT,                        -- список

  -- Экспорт в md (для git-tracking)
  exported_md_path TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_dec_hyp ON decisions(hypothesis_id);
CREATE INDEX idx_dec_date ON decisions(date DESC);
```

### 6.2. Repository pattern

Каждая таблица — отдельный repo. Никакого SQL вне `repositories/`.

**Важно:** при создании `decision` со статусом `green/yellow/red` — автоматически апдейтить `hypotheses.status` соответствующим значением (через триггер или явно в репо).

---

## 7. Дашборд: страницы

### 7.1. Глобальные фильтры (sticky header)

- Date range picker (пресеты: 7д, 14д, с начала кемпа, custom).
- Multi-select каналов.
- Toggle B2C / B2C+B2B / B2B.
- Toggle «показать архивные цели».
- Кнопка «Sync now».

### 7.2. `Overview`

- KPI-стрип: 300 (цель), факт (B2C+B2B), дельта, прогноз (линейная экстраполяция + day-of-week сезонность).
- Daily Sales Line + целевая линия.
- Channel Mix Donut.
- Top-5 / Bottom-5 каналов.
- Auto-detected weak spots (страницы с bounce > 70% и трафиком > X, формы с dropout > 50%, низкое покрытие UTM, etc.) — кликабельны.
- **«Гипотезы в работе»** — карточки гипотез со статусом `in_progress`, сортировка по дедлайну ASC.
- **«Решения за неделю»** — последние 3 записи Decision Log.

### 7.3. `Traffic`

- UTM Sankey: source → medium → campaign → goal/dropout.
- UTM-таблица с экспортом CSV.
- Бейдж «низкое покрытие UTM».
- WoW сравнение.

### 7.4. `Funnel`

- ECharts funnel: визит → регистрация открыта → форма started → submitted → оплата.
- Drill-down by channel.

### 7.5. `Behavior`

- PageDropoffBar.
- HeatmapByHour (визиты × час × день недели).
- GeoMap (top-20 городов).

### 7.6. `Forms`

- По каждой форме: открытий, начатых, отправленных, поле наибольшего dropout.

### 7.7. `B2B`

- CRUD-таблица `b2b_manual`, pipeline по этапам, прогноз.

### 7.8. `Hypotheses` (Double Diamond + методология Воронковой)

**Структура страницы**: трёхколоночный layout по фазам Double Diamond — `Discover` (read-only auto-findings), `Define` (problem hypotheses), `Develop` (solution hypotheses). Колонка `Deliver` — переход на страницу `Decisions`.

**Компоненты:**

#### `HypothesisStructuredEditor.tsx`
Форма создаёт гипотезу строго по шаблону Воронковой. Поля (все required, кроме `description`):

- **Subject** (ЦА) — input + autocomplete из существующих гипотез.
- **Action** — select: «готов купить» / «готов заплатить за» / «переключится с» / «оставит контакт» / `custom`.
- **Solution** — textarea.
- **Condition** — textarea (after «если»). Без этого поля кнопка `Save` дисейблится.
- Live preview: «{subject} {action} {solution}, если {condition}».
- **Title** (краткое summary для таблицы) — autogenerate из subject+action+solution с возможностью отредактировать.

#### `HiddenAssumptionsList.tsx`
Список допущений. **Валидация: минимум 3 элемента** с покрытием минимум 3 категорий из `[behavior, market, tech]`. При попытке сохранить меньше — UI блокирует с сообщением «Воронкова требует ≥3 допущений в категориях behavior/market/tech. Что мы предполагаем?»

#### `ValidationMethodsList.tsx`
Список методов проверки. **Минимум 2** разных типа. Типы:
- `synthetic` — synthetic CustDev через skill (`.claude/skills/synthetic-custdev/`).
- `live` — живые интервью (поля: количество респондентов, профиль).
- `quantitative` — запрос к данным (поля: метрика, срез, порог).
- `market` — рыночные сигналы (поля: что искать, где).

Для `quantitative` — встроенный «Query Builder» с привязкой к таблицам `channel_stats` / `raw_responses` (генерирует валидный фильтр и сохраняет в `evidence`).

#### `ICESlider.tsx`
Три ползунка `Impact / Confidence / Ease` (1–10) **с обязательным rationale** под каждым (1 строка). Выше — live preview `I × C × E = X` (диапазон 1–1000) с цветной плашкой:
- 1–125: серый («низкий приоритет»)
- 126–342: жёлтый («средний»)
- 343–729: оранжевый («высокий»)
- 730–1000: красный («top priority»)

Формула product выбрана сознательно — она резко поднимает гипотезы с высокими значениями во всех трёх параметрах и наказывает однобокие («Impact=10, Confidence=2» = 40, а не 4 в среднем). См. ADR `docs/decisions/005-ice-product-vs-mean.md`.

#### `TrafficLightCriteria.tsx`
Три textarea: Зелёный / Жёлтый / Красный. Каждое — **с конкретным порогом и метрикой** (placeholder подсказывает: «3 из 5 респондентов скажут X», «конверсия на канале вырастет с 1.2% до ≥1.5% за 7 дней», «не менее 80 visits за неделю с этого источника»).

#### `DeadlineCountdown.tsx`
Input «дней на проверку» + расчётная дата дедлайна. Цветной countdown в UI после создания. По истечении — статус `expired`, отдельный фильтр.

#### `DataEvidencePanel.tsx`
К каждой гипотезе можно прикрепить evidence — ссылку на конкретный data slice (`raw_response_id` + filter). Без evidence гипотеза имеет badge `unverified`. В отчёт без evidence гипотезы не попадают (кроме раздела «Drafts» в Data Appendix).

#### `ICEScatter.tsx`
X = Impact, Y = Confidence, размер = Ease, цвет = phase (define/develop), shape = status. Hover → краткая карточка гипотезы.

#### Таблица гипотез
TanStack Table, колонки: `#`, `Title`, `Phase`, `Status`, `ICE`, `Days to deadline`, `Evidence`, `Actions`. Сортировка по ICE DESC по умолчанию.

#### Кнопка «Generate hypothesis with skill»
Открывает модалку с инструкцией: «Скопируй промпт из `.claude/skills/hypothesis-check/SKILL.md`, передай свою сырую идею в Claude, получи структурированный draft, вставь поля сюда». Это не automation, а UX-помощник.

### 7.9. `Decisions` (Decision Log)

Список карточек DL-{N} в формате skill-decision-log.md. CRUD с шаблоном. Timeline-view (хронология). Фильтр по `outcome`. Поиск по `findings`/`evidence`.

При создании DL **обязательно** выбрать связанную гипотезу. После сохранения — статус гипотезы автоматически обновляется на `outcome`.

Экспорт в `data/decisions/DL-{N}.md` для возможного git-commit (опционально).

### 7.10. `Report Preview`

Превью отчёта в браузере = та же страница, которая рендерится в PDF. Кнопки Export DOCX / Export PDF. Чекбоксы секций. Селект даты отсечки данных.

---

## 8. Double Diamond + методология Воронковой

Применяем Double Diamond на верхнем уровне, методологию Воронковой — внутри фаз Define и Develop.

| Фаза DD | Что происходит | Skill / инструмент |
|---|---|---|
| **Discover** | Автосбор данных Метрики, auto-findings (аномалии, weak spots) | `fetch-metrika.ts`, dashboards |
| **Define** | Формулируем problem-hypotheses по шаблону Воронковой, считаем ICE = I×C×E | `.claude/skills/hypothesis-check/` |
| **Develop** | Solution-hypotheses к каждой problem, тот же шаблон + ICE | `.claude/skills/hypothesis-check/` |
| **Deliver** | Проверка top-N решений → Decision Log → action plan | `.claude/skills/synthetic-custdev/`, `.claude/skills/decision-log/` |

**Замкнутый цикл:**
```
CLAUDE.md (контекст продукта)
    ↓
Discover → данные дашборда
    ↓
Define → problem hypothesis (формат + допущения + методы + критерии + ICE + дедлайн)
    ↓
Develop → solution hypothesis (тот же шаблон)
    ↓
Проверка → synthetic CustDev / quantitative / market scan
    ↓
Decision Log (green / yellow / red + цитаты + next step)
    ↓
Обновление CLAUDE.md (3 последних DL подгружаются в контекст)
    ↓
Новый цикл
```

Это **обязательная** структура. Гипотеза без всех 4 шагов считается недокументированной и в отчёт не попадает.

---

## 9. ICE — реализация

**Формула**: `ICE = Impact × Confidence × Ease`. Каждый параметр 1–10. Диапазон итога: 1–1000.

**Почему product, а не среднее** (ADR `005-ice-product-vs-mean.md`):
- Sample 1: I=10, C=2, E=10 → mean=7.3 (выглядит «средне-высоко»), product=200 (правильно сигналит «низкая уверенность тянет вниз»).
- Sample 2: I=8, C=7, E=6 → mean=7, product=336 — обе хороши.
- Sample 3: I=8, C=5, E=7 → product=280 (пример из skill-hypothesis-check.md).

Product **наказывает однобокие гипотезы** — это поведение, нужное для приоритизации.

Конфиг (`code/shared/src/constants.ts`):
```ts
export const ICE_CONFIG = {
  formula: 'product',                   // 'product' | 'arithmetic_mean' (через ADR)
  scale: { min: 1, max: 10 },
  thresholds: {
    low: 125,                           // 5*5*5
    medium: 342,                        // ~7*7*7
    high: 729,                          // 9*9*9
  },
  requireRationale: true,
} as const;
```

В UI каждый параметр требует **rationale в одну строку** (как в примере skill-hypothesis-check.md). Без rationale — `Save` дисейблится.

**Anchor-описания** в `docs/methodology-ice.md`:
- Impact = 10: «гипотеза, если подтверждена, гарантированно добавляет ≥30 билетов до старта».
- Impact = 5: «может дать +10 билетов при удачном раскладе».
- Confidence = 10: «у меня уже есть прямые данные / интервью».
- Confidence = 5: «есть аналогии и логика, но не проверено».
- Ease = 10: «полдня без согласований».
- Ease = 5: «неделя работы + согласование с продюсером».

Тесты в `code/backend/tests/analytics/ice-scorer.test.ts`:
- Корректность product.
- Стабильность сортировки.
- Граничные значения.
- Проверка `ice_score GENERATED ALWAYS AS`.

---

## 10. Генерация отчётов

### 10.1. Snapshot

```ts
type ReportSnapshot = {
  id: string;                     // ulid
  generatedAt: string;            // ISO, frozen
  period: { from: string; to: string };
  kpi: {
    target: 300;
    paidB2C: number;
    paidB2B: number;
    total: number;
    daysLeft: number;
    forecastLinear: number;
    forecastSeasonal: number;
    gap: number;
  };
  channels: ChannelStats[];
  utmCoverage: { withUtm: number; withoutUtm: number; ratio: number; lowCoverageSegments: string[] };
  funnel: FunnelStep[];
  weakSpots: WeakSpot[];
  hypotheses: {
    problems: StructuredHypothesis[];   // полный формат: subject/action/solution/condition,
                                         // assumptions, methods, criteria, ICE+rationale, deadline
    solutions: StructuredHypothesis[];
  };
  decisions: DecisionLogEntry[];        // за период
  actionPlan: ActionItem[];             // top-3 solution-hypothesis по ICE
  appendix: {
    queries: { hash: string; endpoint: string; params: unknown }[];
    methodology: { iceFormula: 'product'; references: string[] };
  };
};
```

**Anti-hallucination invariants:**
- В шаблонах DOCX/PDF только статический текст + подстановки из snapshot.
- Никаких `Date.now()` в render-пути — только `snapshot.generatedAt`.
- Никаких LLM-вызовов на проде.

### 10.2. DOCX-секции

1. **Cover** — название, период, KPI 300, дата генерации.
2. **Executive Summary** — 5–7 буллетов: где мы, прогноз, top-3 действия.
3. **Methodology** — Double Diamond + методология Воронковой (ICE=product, формат гипотезы, допущения, методы, светофор, дедлайны, Decision Log). Атрибуция: «Адаптировано из https://github.com/Voronik1801/Podlodka_crew_AI_Product».
4. **Discover** — данные, аномалии, weak spots.
5. **Define** — для каждой problem-hypothesis:
   - Формат: «{subject} {action} {solution}, если {condition}»
   - Скрытые допущения с категориями
   - Методы проверки
   - ICE с rationale
   - Светофор-критерии
   - Дедлайн
   - Evidence из Метрики (цитаты с `raw_response_id`)
   - Текущий статус
6. **Develop** — то же для solution-hypothesis, привязка к problem через `parent_id`.
7. **Deliver** — action plan + полный Decision Log за период (карточки DL-{N}).
8. **Data Appendix** — таблицы + хэши запросов для воспроизводимости.

Стилизация: `code/backend/src/report/docx/styles.ts`. Колонтитулы: «ProductCamp · Конверсии и лидген · {период}».

### 10.3. PDF

Puppeteer → `http://localhost:${PORT}/report/print?snapshotId=${id}` → `window.__REPORT_READY__ = true` → `page.pdf()`.

### 10.4. Endpoint

```
POST /api/report/generate
Content-Type: application/json
{
  "format": "docx" | "pdf",
  "snapshotId"?: string,
  "sections"?: string[]
}
→ 200 { filePath: string, snapshotId: string }
```

---

## 11. CLI и запуск

### `run.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

command -v node >/dev/null || { echo "Node.js 20+ required"; exit 1; }
command -v pnpm >/dev/null || npm i -g pnpm

[[ -d node_modules ]] || pnpm install --frozen-lockfile

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "→ Заполни YANDEX_OAUTH_TOKEN в .env и запусти снова"
  exit 1
fi

pnpm --filter backend migrate
pnpm --filter backend sync --if-empty

pnpm dev &
DEV_PID=$!

sleep 3
if command -v open >/dev/null; then open "http://localhost:${PORT:-5173}"
elif command -v xdg-open >/dev/null; then xdg-open "http://localhost:${PORT:-5173}"
fi

wait $DEV_PID
```

### Команды

| Команда | Описание |
|---|---|
| `pnpm dev` | backend (tsx watch) + frontend (vite) |
| `pnpm build` | сборка |
| `pnpm sync` | подтянуть данные за период `--from --to` |
| `pnpm report --format=docx|pdf --from=... --to=...` | отчёт без UI |
| `pnpm new-decision --hypothesis=ID` | черновик DL в `data/decisions/` |
| `pnpm test` | vitest |
| `pnpm e2e` | playwright |
| `pnpm lint`, `pnpm typecheck` | стандарт |

---

## 12. GitHub-репозиторий

### 12.1. README.md — обязательные разделы

1. Что это — 1 абзац + контекст ProductCamp.
2. Скриншоты — overview, hypotheses, decisions, report preview.
3. Quickstart.
4. Как получить YANDEX_OAUTH_TOKEN.
5. Архитектура (mermaid из `docs/architecture.md`).
6. Технологический стек.
7. **Методология** — описание Double Diamond + методологии Воронковой со ссылкой на оригинал https://github.com/Voronik1801/Podlodka_crew_AI_Product (с атрибуцией). Краткая выжимка про ICE=product, шаблон гипотезы, светофор, Decision Log.
8. Структура проекта (file tree с комментариями).
9. CLI-команды.
10. CI/CD.
11. Roadmap / Known limitations.
12. License + Authors + Credits (Воронкова — методология).

### 12.2. CLAUDE.md — контекст продукта

Заполнен по шаблону `CLAUDE_template.md` Воронковой (см. отдельный файл рядом с этим промптом — `skills/CLAUDE.md`). Содержит:
- Что за продукт (analytics tool для ProductCamp).
- ЦА (волонтёры трека, ProductCamp team).
- Боль (≠300, разрыв заявки/оплаты).
- Текущая гипотеза проверки (например — «качество трафика подкастов > рефералок по conversion-to-paid»).
- Метрики успеха (зелёный/жёлтый/красный для самого инструмента).
- Стек.
- Принципы (anti-hallucination, evidence-based).
- Ссылка на последние 3 Decision Log.

### 12.3. `.claude/skills/` — skill-промпты

Папка содержит 4 skill-файла, адаптированные под ProductCamp-домен (см. отдельные файлы рядом с этим промптом в `skills/`):

- `hypothesis-check/SKILL.md` — структурирование problem/solution гипотез по конверсиям ProductCamp.
- `synthetic-custdev/SKILL.md` — симуляция представителей ЦА (продакт из B2B-компании, рассматривающий 10 билетов; волонтёр-продакт; CTO-стартап).
- `market-scan/SKILL.md` — рыночный анализ конкурирующих конференций.
- `decision-log/SKILL.md` — шаблон DL и промпт для генерации черновика.

Эти файлы — копии (или адаптации) из https://github.com/Voronik1801/Podlodka_crew_AI_Product с атрибуцией в каждом файле. **Не выдумывать своё** — использовать ровно как есть, с домен-специфичными примерами в конце.

### 12.4. GitHub Actions

**`ci.yml`**:
```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test --coverage
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: build, path: code/frontend/dist }
```

**`e2e.yml`** — Playwright smoke на моках. Проверки:
- Главные страницы рендерятся.
- Создание гипотезы блокируется без 3 допущений и 2 методов.
- ICE считается как product.
- При создании decision статус гипотезы обновляется.
- DOCX и PDF генерируются за < 30 сек.

**`release.yml`** — на тэг `v*.*.*` собирает архив для локального запуска.

### 12.5. PR template чек-листы

- [ ] Тесты проходят
- [ ] `pnpm typecheck` чист
- [ ] Документация обновлена
- [ ] Новых зависимостей нет / есть ADR
- [ ] Скриншоты для UI-изменений
- [ ] Изменения в методологии гипотез согласованы с `docs/methodology-hypothesis-voronik.md`

### 12.6. ISSUE_TEMPLATE/hypothesis.md

```markdown
---
name: Hypothesis
about: Predлагаю продуктовую гипотезу для проверки
labels: hypothesis
---

## Subject (ЦА)
{кто}

## Action
{готов сделать X / готов заплатить за Y / переключится на Z}

## Solution
{что предлагаем}

## Condition (после «если»)
{условие}

## Hidden assumptions (≥3)
- Behavior: ...
- Market: ...
- Tech: ...

## Validation methods (≥2)
- [ ] Synthetic CustDev
- [ ] Live CustDev (N=__)
- [ ] Quantitative (запрос: ____)
- [ ] Market scan

## ICE
- Impact: __ (rationale: ...)
- Confidence: __ (rationale: ...)
- Ease: __ (rationale: ...)
- ICE = I × C × E = __

## Traffic light
- 🟢 Green if: ...
- 🟡 Yellow if: ...
- 🔴 Red if: ...

## Deadline
{N days}
```

---

## 13. Поэтапный план (для агента)

Реализуй итерациями, после каждой — `git commit` + краткий отчёт.

### Итерация 0 — Скелет
- workspace, конфиги, ESLint/Prettier
- Fastify `/health`, React+Vite заглушка
- `run.sh` минимальный
- `ci.yml`
- README заглушка
- **Положить файлы из `skills/` в `.claude/skills/` репозитория**
- **Положить `CLAUDE.md` в корень**
- **Acceptance:** `./run.sh` запускается; в `.claude/skills/` есть 4 skill-файла; `CLAUDE.md` содержит заполненный контекст ProductCamp.

### Итерация 1 — Слой данных
- SQLite + миграции 001–005 (включая `hypotheses` со всеми полями Воронковой и `decisions`).
- Repository pattern.
- Тесты на repo (включая constraint-validation: hypotheses без 3 допущений/2 методов отвергаются на уровне repo).
- **Acceptance:** `pnpm test` зелёный.

### Итерация 2 — Метрика-клиент
- OAuth + Zod + rate limiter + retry.
- Все queries из §5.4 на фикстурах.
- `POST /api/sync`.
- **Acceptance:** `pnpm sync` заполняет SQLite реальными данными.

### Итерация 3 — Backend API
- Endpoints /api/metrics/*, /api/hypotheses (с валидацией структуры по Воронковой), /api/decisions, /api/b2b.
- Swagger на `/docs`.

### Итерация 4 — Дашборд: базовые страницы
- Layout, sticky filters, routing.
- Overview, Traffic, Funnel.
- Все графики.

### Итерация 5 — Behavior, Forms, B2B
- Оставшиеся страницы.

### Итерация 6 — **Hypotheses** (главное)
- `HypothesisStructuredEditor` со всеми полями (§7.8).
- `HiddenAssumptionsList` с валидацией ≥3.
- `ValidationMethodsList` с валидацией ≥2.
- `ICESlider` с product-формулой + rationale.
- `TrafficLightCriteria`.
- `DeadlineCountdown`.
- `DataEvidencePanel`.
- `ICEScatter`.
- DoubleDiamondCanvas.
- **Acceptance:** можно создать гипотезу полного формата, попытка сохранить без 3 допущений или 2 методов — блокируется; ICE считается как product; UI содержит ссылки на `.claude/skills/`.

### Итерация 7 — **Decisions**
- `DecisionLogList`, `DecisionEditor`, `DecisionTimeline`.
- Связь с гипотезой → автоапдейт статуса.
- Экспорт в `data/decisions/DL-{N}.md`.
- **Acceptance:** создаём DL → статус связанной гипотезы меняется на outcome; .md экспорт лежит на диске.

### Итерация 8 — Report Preview + Snapshot
- `SnapshotBuilder` (включая `decisions` за период).
- Превью.

### Итерация 9 — DOCX
- Все секции (включая полный формат гипотезы Воронковой и Decision Log).
- Тест на детерминированность (один snapshot → одинаковая контрольная сумма).

### Итерация 10 — PDF
- Puppeteer + print stylesheet.

### Итерация 11 — Polish + e2e + docs
- Playwright smoke (включая тесты §12.4 e2e.yml).
- Все `docs/*`.
- ADRs.
- `release.yml`.

---

## 14. Acceptance Criteria

Готово, когда:

- [ ] `git clone` + `.env` + `./run.sh` → за < 2 мин работающий дашборд с реальными данными.
- [ ] Дашборд: KPI, Daily Sales с прогнозом, каналы, UTM Sankey, funnel, behavior, forms, B2B, hypotheses, decisions.
- [ ] Все цифры прослеживаемы до `raw_responses` через debug-панель «Where does this number come from?».
- [ ] **Гипотезы соответствуют формату Воронковой**: subject/action/solution/condition + ≥3 допущения (поведение/рынок/тех) + ≥2 метода + светофор + дедлайн + ICE = I × C × E с rationale.
- [ ] **Можно создать ≥5 problem + ≥5 solution гипотез, ≥3 Decision Log записей**; цикл «гипотеза → DL → статус» работает end-to-end.
- [ ] `pnpm report --format=docx|pdf` за < 30 сек; идентичный snapshot → байт-идентичные файлы.
- [ ] DOCX/PDF содержат секцию Methodology с атрибуцией Воронковой и полным шаблоном гипотезы.
- [ ] `pnpm test` зелёный, coverage ≥ 70% на analytics/metrika/report.
- [ ] `pnpm typecheck` чист, все CI workflow зелёные.
- [ ] `.claude/skills/` содержит 4 файла из репозитория Воронковой (с атрибуцией).
- [ ] `CLAUDE.md` в корне заполнен по шаблону, содержит ссылки на 3 последних DL.
- [ ] README позволяет волонтёру без backend-опыта запустить инструмент за 10 минут.
- [ ] PR template и Issue template про гипотезу — на месте.

---

## 15. Что НЕ делать (антипаттерны)

- ❌ LLM на проде в render-пути отчёта.
- ❌ Что-то кроме Fastify+TS без ADR.
- ❌ Recharts вместо ECharts.
- ❌ Хранить токен где-либо кроме `.env`.
- ❌ Гипотезы без полного шаблона Воронковой — UI должен блокировать сохранение.
- ❌ Decision Log без цитат/данных — поле required.
- ❌ ICE как среднее без явного ADR с обоснованием отступления от product.
- ❌ Дашборд без debug-панели «откуда эта цифра».
- ❌ Отчёт без `Data Appendix` с хэшами.
- ❌ Игнорировать B2B (входит в KPI 300).
- ❌ Считать заявки как продажи. Везде явное разделение «заявка / оплата».
- ❌ Изменять методологию из `.claude/skills/` без отметки в `docs/methodology-hypothesis-voronik.md` с reasoning.

---

## 16. Финальная команда для агента

> Прочитай этот документ + 5 файлов из `skills/`. Подтверди понимание (3–5 буллетов: что строим, какой стек, главные риски, как методология Воронковой ложится в Double Diamond). Затем начинай с **Итерации 0**, после каждой итерации — коммит и краткий отчёт (3–5 строк). Если упираешься в неясность — pragmatic default + ADR в `docs/decisions/`.

---

## 17. Атрибуция

Методология структурирования гипотез, ICE = I × C × E (product), формат гипотезы «{subject} {action} {solution}, если {condition}», требования к скрытым допущениям (≥3) и способам проверки (≥2), светофор-критерии (green/yellow/red), Decision Log — адаптировано из:

**Voronik1801 / Podlodka_crew_AI_Product**
https://github.com/Voronik1801/Podlodka_crew_AI_Product

Файлы из репозитория (помещены в `.claude/skills/`):
- `CLAUDE_template.md` → `CLAUDE.md`
- `skill-hypothesis-check.md` → `.claude/skills/hypothesis-check/SKILL.md`
- `skill-synthetic-custdev.md` → `.claude/skills/synthetic-custdev/SKILL.md`
- `skill-market-scan.md` → `.claude/skills/market-scan/SKILL.md`
- `skill-decision-log.md` → `.claude/skills/decision-log/SKILL.md`

В каждом адаптированном файле — ссылка на оригинал в шапке.
