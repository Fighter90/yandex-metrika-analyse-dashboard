# Fix-Prompt v2.6.0 — финальный спринт перед пилотом

> Целевой агент: **Claude Code** в репозитории `metrika_analyse_dashboard`.
> Дата: 2026-05-27.
> Базис: `qa/qa-report-v2.6.0.md` (🟡 CONDITIONAL GO).
> Цель: за **2 дня** закрыть 1 Critical + 4 Major и получить 🟢 GO для пилота.
> Старые fix-промты v2.3.0/v2.4.0/v2.5.0 — справочные; рабочий — этот.

---

## 0. TL;DR

В v2.6.0 закрыто **3 Blocker + 7 Critical** из v2.3.0. Остались:

- 🟠 **1 Critical** (C-001 — stepper-форма /hypotheses).
- 🟡 **4 Major** (визиты не сходятся, bar-chart обрезан, UTM coverage 0%, /overview label).
- 🟢 **3 Minor** + 1 Trivial.

После починки C-001 + M-002 + M-003 + M-005 — релиз готов к пилоту с командой.

---

## 1. День 1 — Stepper-форма /hypotheses (C-001) — Critical

### 1.1. Spec

Создать `docs/specs/015-hypotheses-stepper-form.md`:

- 5 шагов формы (Сформулировать → Допущения → Методы → ICE → Светофор+дедлайн).
- React-hook-form + zod-схема.
- Кнопка «Сохранить как DRAFT» на каждом шаге.
- Привязка к snapshotId (autodetect последний по периоду).
- Подсказки из `.claude/skills/hypothesis-check/SKILL.md`.

### 1.2. UI — переписать `code/frontend/src/routes/hypotheses.tsx`

Структура страницы:

```
<Layout>
  <FilterBar/>
  <PageHeader title="Гипотезы" cta={<NewHypothesisButton/>}/>
  <HypothesesList/>     # таблица с фильтрами по статусу/типу
  <NewHypothesisDrawer/>  # stepper-форма в drawer/modal
  <AIGenerateSection/>    # сохранить старую AI-кнопку как помощник
</Layout>
```

`<HypothesesList>`:

- GET /api/hypotheses — берёт список.
- Колонки: ID, фраза-резюме, тип (problem/solution), статус (🟢/🟡/🔴), ICE-score, дедлайн, snapshotId.
- Empty state: «У вас 0 гипотез. Начните со слабого места — Обзор → клик по бейджу» с deep-link.

`<NewHypothesisDrawer>` — 5 шагов (см. fix-prompt-v2.4.0 §2.2 для ASCII-мокапа):

```typescript
// code/shared/src/hypothesis-schema.ts
import { z } from 'zod';

export const HypothesisSchema = z.object({
  // Шаг 1: формулировка
  subject: z.string().min(3),
  action: z.enum(['готова сделать', 'готова заплатить за', 'переключится на']),
  solution: z.string().min(3),
  condition: z.string().min(3),
  type: z.enum(['problem', 'solution']),

  // Шаг 2: допущения (≥3 в 3 категориях)
  assumptions: z
    .array(
      z.object({
        category: z.enum(['риск', 'гипотеза', 'неизвестное']),
        text: z.string().min(5),
      }),
    )
    .min(3)
    .refine(
      (arr) => new Set(arr.map((a) => a.category)).size === 3,
      'Нужно по одному допущению в каждой из 3 категорий',
    ),

  // Шаг 3: методы (≥2)
  methods: z
    .array(
      z.object({
        type: z.enum(['custdev', 'ab_test', 'analytics', 'mixed']),
        metric: z.string().min(2),
        deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(2),

  // Шаг 4: ICE (произведение, не среднее)
  ice: z.object({
    impact: z.number().min(1).max(5),
    impactReason: z.string().min(5),
    confidence: z.number().min(1).max(5),
    confidenceReason: z.string().min(5),
    ease: z.number().min(1).max(5),
    easeReason: z.string().min(5),
  }),

  // Шаг 5: светофор + дедлайн + snapshot
  trafficLight: z.object({
    green: z.string().min(3),
    yellow: z.string().min(3),
    red: z.string().min(3),
  }),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  snapshotId: z.string().uuid().optional(),

  // Meta
  status: z.enum(['draft', 'active', 'closed']),
});

export type HypothesisInput = z.infer<typeof HypothesisSchema>;
export const calcIce = (ice: HypothesisInput['ice']) => ice.impact * ice.confidence * ice.ease;
```

### 1.3. Deep-link prefill

`code/frontend/src/lib/hypothesis-prefill.ts`:

```typescript
export function parseHypothesisPrefill(searchParams: URLSearchParams) {
  const source = searchParams.get('source');
  const channel = searchParams.get('channel');
  const metric = searchParams.get('metric');
  const value = searchParams.get('value');
  const snapshotId = searchParams.get('snapshotId');

  if (!source) return null;

  return {
    subject: channel ? `Целевая аудитория ${channel}` : '',
    type: 'problem' as const,
    assumptions:
      metric && value ? [{ category: 'риск', text: `${metric} ${value} ниже бенчмарка` }] : [],
    snapshotId,
  };
}
```

При открытии `/hypotheses?source=overview&channel=Direct&metric=cr&value=0.005&snapshotId=…`:

- Open drawer.
- Prefill form with parsed defaults.
- Шаг 1 уже частично заполнен.

### 1.4. Backend

`code/backend/src/routes/hypotheses.ts` (вероятно уже есть):

- POST /api/hypotheses — валидация через `HypothesisSchema`.
- PATCH /api/hypotheses/:id/status — смена статуса (draft → active → closed).
- Поля в БД (миграция `010_hypotheses_v2.sql`):
  ```sql
  ALTER TABLE hypotheses ADD COLUMN type TEXT;
  ALTER TABLE hypotheses ADD COLUMN subject TEXT;
  ALTER TABLE hypotheses ADD COLUMN action TEXT;
  ALTER TABLE hypotheses ADD COLUMN solution TEXT;
  ALTER TABLE hypotheses ADD COLUMN condition TEXT;
  ALTER TABLE hypotheses ADD COLUMN assumptions_json TEXT;
  ALTER TABLE hypotheses ADD COLUMN methods_json TEXT;
  ALTER TABLE hypotheses ADD COLUMN ice_json TEXT;
  ALTER TABLE hypotheses ADD COLUMN ice_score INTEGER;
  ALTER TABLE hypotheses ADD COLUMN traffic_light_json TEXT;
  ALTER TABLE hypotheses ADD COLUMN deadline TEXT;
  ALTER TABLE hypotheses ADD COLUMN snapshot_id TEXT;
  ALTER TABLE hypotheses ADD COLUMN status TEXT DEFAULT 'draft';
  ```

### 1.5. Тесты

- `code/shared/src/__tests__/hypothesis-schema.test.ts` — schema отвергает невалидные.
- `code/backend/tests/routes/hypotheses.route.test.ts` — POST с невалидным body → 400.
- `e2e/hypotheses.spec.ts` — пользователь проходит 5 шагов, сохраняет, видит в списке.

### 1.6. Acceptance

- [ ] /hypotheses показывает empty state при `GET /api/hypotheses → []`.
- [ ] Кнопка «Новая гипотеза» открывает drawer.
- [ ] Stepper 5 шагов, прогресс-бар сверху.
- [ ] Невалидные данные → inline-ошибки, Save заблокирован.
- [ ] «Сохранить как DRAFT» работает на любом шаге.
- [ ] После save — гипотеза в списке + на /decisions dropdown заполнен.

---

## 2. День 1 (parallel) — Единый factsource (M-002) — Major

### 2.1. Цель

Поле «Визитов» совпадает на /overview, /traffic, /behavior, /funnel, /goals, /report.

### 2.2. Backend

`code/backend/src/analytics/factsource.ts`:

```typescript
export interface PeriodTotals {
  visits: number;
  uniqueUsers: number;
  applications: number;
  payments: number;
  cr: number;
  bounceRate: number;
}

export function getPeriodTotals(
  db: Database,
  from: string,
  to: string,
  segment: Segment,
): PeriodTotals {
  // ОДИН SQL запрос — из channel_stats (а не из page_stats или утм_stats)
  const row = db
    .prepare(
      `
    SELECT
      SUM(visits) AS visits,
      SUM(unique_users) AS uniqueUsers,
      SUM(goal_reaches) AS applications,
      AVG(bounce_rate) AS bounceRate
    FROM channel_stats
    WHERE date BETWEEN ? AND ?
      AND segment IN (${segmentSqlList(segment)})
  `,
    )
    .get(from, to) as PeriodRow;

  const payments = db
    .prepare(
      `
    SELECT COUNT(*) AS paid
    FROM b2b_manual
    WHERE stage = 'paid' AND paid_at BETWEEN ? AND ?
  `,
    )
    .get(from, to).paid;

  return {
    visits: row.visits ?? 0,
    uniqueUsers: row.uniqueUsers ?? 0,
    applications: row.applications ?? 0,
    payments,
    cr: row.visits ? clampRatio(row.applications / row.visits) : 0,
    bounceRate: clampRatio(row.bounceRate ?? 0),
  };
}
```

### 2.3. Использование

В `code/backend/src/routes/`:

- `/api/metrics/channels`, `/api/metrics/utm`, `/api/metrics/geo-device`, `/api/metrics/pages`, `/api/report/snapshot` — все используют `getPeriodTotals` для `totals`-блока.
- В `analytics/behavior.ts` — НЕ считать визиты из `page_stats.SUM(visits)`, а брать `getPeriodTotals().visits` для display KPI.

### 2.4. Inv-тест

`code/backend/tests/factsource.invariant.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { initDb, seedDemo } from '../src/db';
import { getPeriodTotals } from '../src/analytics/factsource';
import { getBehaviorPage } from '../src/analytics/behavior';
import { getFunnelPage } from '../src/analytics/funnel';
import { getGoalsPage } from '../src/analytics/goals';
import { buildSnapshot } from '../src/report/snapshot';

describe('Inv: visits consistency across pages', () => {
  it('all surfaces show identical visits for the same period', async () => {
    const db = await initDb();
    await seedDemo(db);
    const from = '2026-05-14';
    const to = '2026-05-27';
    const segment = { type: 'b2c_b2b', includeArchived: false };

    const fact = getPeriodTotals(db, from, to, segment);
    const behavior = getBehaviorPage(db, from, to, segment);
    const funnel = getFunnelPage(db, from, to, segment);
    const goals = getGoalsPage(db, from, to, segment);
    const snapshot = buildSnapshot(db, from, to, segment);

    expect(behavior.visits).toBe(fact.visits);
    expect(funnel.visits).toBe(fact.visits);
    expect(goals.visits).toBe(fact.visits);
    expect(snapshot.totals.visits).toBe(fact.visits);
  });
});
```

### 2.5. Acceptance

- [ ] На /behavior визиты совпадают с /goals и /funnel.
- [ ] Inv-тест зелёный.
- [ ] CI запускает тест на каждом PR.

---

## 3. День 2 — ECharts bar-chart /traffic (M-003) — Major

### 3.1. Где править

`code/frontend/src/routes/traffic.tsx` — первый ECharts «Каналы — визиты».

### 3.2. Опции

```typescript
const channelBarOption = {
  ...usePcaTheme(),
  xAxis: {
    type: 'category',
    data: channels.map((c) => c.channel),
    axisLabel: {
      rotate: 30,
      interval: 0,
      formatter: (val: string) => (val.length > 12 ? val.slice(0, 11) + '…' : val),
    },
  },
  yAxis: {
    type: 'value',
    scale: true, // не растягивать до 0
    splitNumber: 5,
  },
  series: [
    {
      type: 'bar',
      data: channels.map((c) => ({
        value: c.visits,
        itemStyle: { color: CHANNEL_COLORS[c.channel] },
      })),
      barMaxWidth: 60,
      label: {
        show: true,
        position: 'top',
        formatter: ({ value }) => formatNumber(value as number),
      },
    },
  ],
  tooltip: {
    trigger: 'axis',
    formatter: (params) => `${params[0].name}<br/>Визитов: ${formatNumber(params[0].value)}`,
  },
};
```

### 3.3. Acceptance

- [ ] Все каналы с visits > 0 видны на оси X.
- [ ] Столбцы видимые, с цветом из CHANNEL_COLORS, с labels.
- [ ] Tooltip показывает значение и форматирование.

---

## 4. День 2 — formatGoalLabel на /overview (M-005) — Major

### 4.1. Функция (если ещё нет в `@pca/shared`)

```typescript
// code/shared/src/format-goal.ts
export interface GoalLabel {
  title: string; // "Заявок B2C" / "Оплат"
  isPaid: boolean;
  showApplicationsCaveat: boolean; // показывать "заявка ≠ оплата"
  showEstimate: boolean; // показывать "≈ X платных"
}

export function formatGoalLabel(goal: PrimaryGoal): GoalLabel {
  if (goal.type === 'e_purchase') {
    return {
      title: 'Оплат',
      isPaid: true,
      showApplicationsCaveat: false,
      showEstimate: false,
    };
  }
  return {
    title: 'Заявок B2C',
    isPaid: false,
    showApplicationsCaveat: true,
    showEstimate: true,
  };
}
```

### 4.2. Применить

- `code/frontend/src/routes/overview.tsx` — KPI «Заявок B2C» / «Оплат» через `formatGoalLabel`.
- `code/frontend/src/routes/goals.tsx` — тот же helper.
- `code/frontend/src/routes/funnel.tsx` — тот же helper.
- В DOCX/PDF render (`code/backend/src/report/`) — тот же helper.

### 4.3. Acceptance

- [ ] При `primary_goal.type='e_purchase'` на /overview видно «Оплат: 35», без бейджа «заявка ≠ оплата».
- [ ] При другой цели — «Заявок B2C: 35 · заявка ≠ оплата».

---

## 5. День 2 — UTM coverage (M-004) — Major

### 5.1. Расчёт

`code/backend/src/analytics/utm-coverage.ts`:

```typescript
export function getUtmCoverage(db: Database, from: string, to: string, segment: Segment): number {
  const totalVisits =
    db
      .prepare(
        `
    SELECT SUM(visits) AS total
    FROM channel_stats
    WHERE date BETWEEN ? AND ? AND segment IN (${segmentSqlList(segment)})
  `,
      )
      .get(from, to)?.total ?? 0;

  const utmVisits =
    db
      .prepare(
        `
    SELECT SUM(visits) AS utm
    FROM utm_stats
    WHERE date BETWEEN ? AND ? AND segment IN (${segmentSqlList(segment)})
      AND (utm_source IS NOT NULL AND utm_source != '')
  `,
      )
      .get(from, to)?.utm ?? 0;

  return totalVisits > 0 ? clampRatio(utmVisits / totalVisits) : 0;
}
```

### 5.2. Inv-тест

```typescript
it('utm coverage > 0 when utm_stats has rows', async () => {
  const db = await initDb();
  await seedDemo(db); // seed создаёт ≥1 utm_stats запись
  const coverage = getUtmCoverage(db, '2026-05-14', '2026-05-27', defaultSegment);
  expect(coverage).toBeGreaterThan(0);
});
```

### 5.3. Acceptance

- [ ] /traffic не показывает «0.0%», если в `utm_stats` есть записи.
- [ ] Tooltip ⓘ с формулой.

---

## 6. День 2 (если успеем) — Minor

### 6.1. m-006: Settings sync-text

`code/frontend/src/routes/settings.tsx`:

```diff
- Последние 14 дней → SQLite → перегенерация отчётов
+ Период из текущего фильтра ({from} — {to}) → SQLite → перегенерация отчётов
```

### 6.2. m-007: GOAL_ID combobox

Замена `<select>` на `<Combobox>` (`@headlessui/react`) с search-input. Группировка «Активные» / «Архивные».

### 6.3. m-008: Seed-гипотезы

`code/backend/src/scripts/seed.ts` — добавить ENV `SEED_HYPOTHESES=true` → создать 3 гипотезы из `qa/fix-prompt-v2.3.0.md §5.4` (H-001 Direct CR, H-003 Mailing, H-005 B2B-аутрич).

### 6.4. t-009: Дайджест tooltip

`code/frontend/src/routes/overview.tsx`:

```diff
- <h3>Главное слабое место</h3>
+ <h3>Главное слабое место <Tooltip>Канал с наибольшим трафиком и низкой конверсией — наибольший потенциал улучшения</Tooltip></h3>
```

---

## 7. Чек-лист приёмки v2.6.1

После починки:

- [ ] `pnpm typecheck && pnpm lint && pnpm format:check && pnpm -r coverage && pnpm build` — зелёное.
- [ ] Inv-тест visits consistency — зелёный.
- [ ] /hypotheses показывает empty state + кнопку «Новая гипотеза» (drawer 5 шагов).
- [ ] Можно создать гипотезу — она в списке, в БД, на /decisions dropdown заполнен.
- [ ] /traffic bar-chart показывает все каналы со столбцами.
- [ ] /overview KPI: при `e_purchase` показывает «Оплат», иначе «Заявок B2C».
- [ ] /traffic UTM-coverage > 0% (если в БД есть utm_stats).
- [ ] Версия в `package.json` бампнута до 2.6.1.
- [ ] CHANGELOG.md обновлён.
- [ ] Все шапки доков sync на 2.6.1 (`scripts/sync-versions.ts`).

---

## 8. После приёмки — что ещё ОБЯЗАТЕЛЬНО проверить руками

Эти проверки нельзя автоматизировать в sandbox, нужен живой прогон на компьютере пользователя:

1. **DOCX live**: открыть в Word/LibreOffice, проверить:
   - Arial/Times 11–12pt.
   - Line-spacing 1.5.
   - Поля 30/15/20/20мм.
   - Нумерация страниц.
   - Подписи «Рисунок N — …», «Таблица N — …».
   - Блок «🟢 Корректно / 🔴 Внимание / 💡 Рекомендация» после каждого графика.

2. **PDF live**: то же.

3. **DOCX vs PDF**: SHA-256 контента совпадает (без zip/pdf timestamps).

4. **Mobile (375×812)**:
   - Гамбургер открывает все 12 пунктов.
   - KPI-стрипы 2 колонки.
   - Таблицы скроллятся горизонтально.

5. **Live sync**: прогресс-бар 10 стадий с описанием каждой.

6. **Live AI**: 5 секций нарратива, время <60c.

7. **Сверка с Метрикой**: открыть browser метрику, выбрать LastSign, сравнить визиты построчно за тот же день.

---

## 9. Roadmap до 🟢 GO для прода

| Релиз      | Состав                                                                  | Сроки    |
| ---------- | ----------------------------------------------------------------------- | -------- |
| **v2.6.1** | §1 + §2 + §3 + §4 + §5 (C-001 + 4 Major)                                | 2 дня    |
| **v2.6.2** | §6 (3 Minor + Trivial)                                                  | 1 день   |
| **v2.7.0** | DOCX/PDF live валидация, мобильный pass, Lighthouse a11y ≥ 90           | 2 дня    |
| **v3.0.0** | Новые графики (см. fix-prompt-v2.3.0 §5), event tracking, weekly digest | 2 недели |

После v2.7.0 — **🟢 GO для прода** (команда ProductCamp использует на 100%).

---

## 10. Финальный вердикт

Релиз v2.6.0 — **«пилотный»**: можно показывать команде, можно собирать обратную связь, но
**нельзя называть production-ready** до закрытия C-001 + M-002 + M-003 + M-005.

После v2.6.1 — **«beta»**: можно использовать в реальной работе с предупреждением «может быть мелкие баги».

После v2.7.0 — **«production-ready»**: GO для команды ProductCamp на 100%.

---

> «Stepper-форма гипотезы — не фича, а сердце продукта. Без неё инструмент остаётся дашбордом.»
