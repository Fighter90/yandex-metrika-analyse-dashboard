# Fix-Prompt FINAL — единственный рабочий план

> Целевой агент: **Claude Code** в репозитории `metrika_analyse_dashboard`.
> Дата: 2026-05-27. Версия документа: **FINAL** (v2.7.0).
>
> **Это окончательный план починки.** Заменяет все предыдущие fix-промты
> (v2.3.0 / v2.4.0 / v2.5.0 / v2.6.0). Старые сохранены в `qa/` для трассировки,
> **в работе использовать только этот файл**.
>
> Цель: за 3–5 дней довести продукт до 🟢 **GO для пилота с командой ProductCamp**.

---

## 🔄 ИЗМЕНЕНИЕ НАПРАВЛЕНИЯ (решение пользователя 2026-05-27)

**Удалить страницы `/hypotheses`, `/decisions`, `/b2b` из UI.**

Обоснование (со слов заказчика):

> «Отчёту на срезе данных строится всё равно, и там уже есть гипотезы и решения.
> Эти страницы не нужны.»

Следовательно:

- **Гипотезы** — генерируются AI внутри отчёта по данным снапшота (раздел «Гипотезы роста»).
- **Решения (Decision Log)** — формулируются AI внутри отчёта на основе данных и гипотез (раздел «Decision Log»).
- **B2B** — ручной ввод сделок переносится в **Настройки** (раздел «B2B сделки»), либо в **Отчёт** при формировании среза (поле «Текущий B2B-пайплайн» перед нажатием «Сформировать срез»).
- Меню возвращается к **9 пунктам**: Обзор, Трафик, Поведение, Воронка, Цели, Отчёт, История, Настройки, Справка.

Это инвалидирует C-001 (stepper-форму) из предыдущих fix-промтов — она **не нужна**.

---

## 0. Принципы (поверх `CLAUDE.md`)

1. **Anti-hallucination above all** — каждая цифра в отчёте и UI прослеживается до `raw_responses`.
2. **Согласованность данных** между страницами — Blocker, если расходятся.
3. **Заявка ≠ оплата** — везде в коде, UI, отчётах разделены.
4. **Гипотеза без формата гипотезы — не гипотеза** — теперь относится к AI-генератору: prompt
   к Anthropic строит гипотезы по формату Воронковой (subject/action/solution/condition + 3
   допущения в 3 категориях + 2 метода + ICE=I×C×E + светофор + дедлайн).
5. **ICE = I × C × E** (произведение, ADR-005).
6. **Decision Log в отчёте** — AI генерит ≥3 предполагаемых решения с привязкой к гипотезам.
7. **Единая палитра / типографика / отступы** — мини-DS.
8. **WCAG AA** — контраст ≥ 4.5:1, не только цветом, фокус видим.
9. **ГОСТ Р 7.32-2017** для DOCX/PDF + блок «🟢/🔴» после каждого графика.
10. **Spec-Driven Development** — нетривиальная фича → спека → review → tests → impl.

---

## 1. День 1 — Удаление страниц методологии

### 1.1. Удалить роуты и страницы

**Frontend:**

- Удалить `code/frontend/src/routes/hypotheses.tsx`.
- Удалить `code/frontend/src/routes/decisions.tsx`.
- Удалить `code/frontend/src/routes/b2b.tsx`.
- Удалить пункты «Гипотезы», «Решения», «B2B» из `code/frontend/src/components/Layout.tsx` (`NAV_ITEMS`).
- Удалить тесты `__tests__/hypotheses.test.tsx`, `decisions.test.tsx`, `b2b.test.tsx`.

**Backend** — оставить API (используется внутри report-генератора):

- `/api/hypotheses` — оставить как **internal** (используется report-builder при генерации AI).
- `/api/decisions` — оставить как internal.
- `/api/b2b` — оставить, переключить вызовы на /settings/b2b раздел.
- В Swagger пометить эти эндпоинты `tags: ['internal']`.

**Acceptance:**

- [ ] Меню показывает 9 пунктов.
- [ ] `/hypotheses`, `/decisions`, `/b2b` возвращают 404 на фронте (или редирект на /report).
- [ ] e2e: попытка перехода на старые URL → редирект `/report`.

### 1.2. Перенос B2B-ввода в Settings

**Settings новая секция** «B2B-пайплайн» (между «Источник данных» и «AI»):

- Kanban 4 этапа (LEAD/NEGOTIATION/INVOICED/PAID) — компактный, в collapse-секции.
- Форма добавления (компания/билеты/этап) внутри секции.
- Кнопка «Развернуть» открывает полную таблицу в drawer.
- Подсказка: «B2B-сделки участвуют в расчёте прогресса к цели 300 платных билетов».

**Acceptance:**

- [ ] Settings содержит B2B kanban.
- [ ] Добавление/удаление сделки работает.
- [ ] /goals и /funnel показывают данные из b2b_manual корректно.

### 1.3. AI генерит гипотезы и решения внутри отчёта

**Backend:**

- `code/backend/src/report/ai/hypotheses-generator.ts` — на вход снапшот, на выход
  массив гипотез по формату Воронковой.
- `code/backend/src/report/ai/decisions-generator.ts` — на вход снапшот + гипотезы,
  на выход ≥3 предполагаемых решения.
- Сохраняются в снапшот (`snapshot.aiHypotheses`, `snapshot.aiDecisions`) — детерминизм
  сохраняется (render-путь не делает LLM-вызовов).

**Prompt-templates** (в `code/backend/src/report/ai/prompts/`):

```
hypotheses-prompt.md:
По данным снапшота {snapshot.totals} и слабым местам {snapshot.weakSpots},
сгенерируй ≥3 гипотезы роста ПО ФОРМАТУ ВОРОНКОВОЙ:
- Формат: «{ЦА} {готова сделать / готова заплатить за / переключится на} {решение}, если {условие}»
- ≥3 допущения в 3 категориях (риск / гипотеза / неизвестное)
- ≥2 метода проверки (custdev / A-B / analytics) с метрикой и сроком
- ICE = I × C × E с обоснованием каждой оценки 1–5
- Светофор (🟢 если ... / 🟡 если ... / 🔴 если ...)
- Дедлайн проверки
Только JSON формата {hypotheses: [...]}, ничего больше.
```

```
decisions-prompt.md:
По гипотезам {hypotheses} и снапшоту {snapshot}, сгенерируй ≥3 предполагаемых решения
по шаблону Decision Log (см. .claude/skills/decision-log/SKILL.md):
- Привязка к гипотезе
- Метод проверки
- Период (дней)
- Объём (scope)
- Вывод
- Уверенность (low/medium/high)
- Цитата (если есть в данных)
- Источник (snapshotId, raw_response_id)
- Исход (🟢/🟡/🔴)
- Обоснование исхода
```

**Frontend** — в /report превью:

- Блок «Гипотезы роста» (после «Слабые места»): список AI-гипотез с раскрываемыми деталями.
- Блок «Decision Log (предполагаемые решения)»: список AI-решений.
- В DOCX/PDF — те же блоки, оформлены по ГОСТ.

**Acceptance:**

- [ ] После «Сгенерировать AI-анализ» в /report виден блок «Гипотезы роста» с ≥3 гипотезами.
- [ ] Каждая гипотеза содержит все поля методологии Воронковой.
- [ ] Блок «Decision Log» содержит ≥3 решения.
- [ ] DOCX/PDF включают эти блоки.

---

## 2. День 2 — Согласованность данных (M-002)

### 2.1. Единый factsource

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

export function getPeriodTotals(db, from, to, segment): PeriodTotals {
  const row = db
    .prepare(
      `
    SELECT SUM(visits) AS visits,
           SUM(unique_users) AS uniqueUsers,
           SUM(goal_reaches) AS applications,
           AVG(bounce_rate) AS bounceRate
    FROM channel_stats
    WHERE date BETWEEN ? AND ?
      AND segment IN (${segmentSqlList(segment)})
  `,
    )
    .get(from, to);

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

### 2.2. Использование

Все роуты `/api/metrics/*` и `/api/report/*` используют `getPeriodTotals` для KPI-блока.
`analytics/behavior.ts` — НЕ считает визиты из `SUM(page_stats.visits)`, а берёт `factsource.visits`.

### 2.3. Inv-тест

`code/backend/tests/factsource.invariant.test.ts`:

```typescript
it('all surfaces show identical visits', async () => {
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
```

**Acceptance:**

- [ ] На /behavior визиты совпадают с /goals и /funnel.
- [ ] Inv-тест зелёный.
- [ ] CI запускает тест.

---

## 3. День 2 — ECharts bar-chart /traffic (M-003)

`code/frontend/src/routes/traffic.tsx`:

```typescript
const channelBarOption = {
  ...usePcaTheme(),
  xAxis: {
    type: 'category',
    data: channels.map((c) => c.channel),
    axisLabel: {
      rotate: 30,
      interval: 0,
      formatter: (val) => (val.length > 12 ? val.slice(0, 11) + '…' : val),
    },
  },
  yAxis: { type: 'value', scale: true, splitNumber: 5 },
  series: [
    {
      type: 'bar',
      data: channels.map((c) => ({
        value: c.visits,
        itemStyle: { color: CHANNEL_COLORS[c.channel] },
      })),
      barMaxWidth: 60,
      label: { show: true, position: 'top', formatter: ({ value }) => formatNumber(value) },
    },
  ],
  tooltip: { trigger: 'axis' },
};
```

**Acceptance:**

- [ ] Все каналы с visits > 0 видны на оси X.
- [ ] Столбцы видимые с CHANNEL_COLORS.
- [ ] Tooltip показывает значение.

---

## 4. День 2 — formatGoalLabel (M-005)

`code/shared/src/format-goal.ts`:

```typescript
export function formatGoalLabel(goal: PrimaryGoal): GoalLabel {
  if (goal.type === 'e_purchase') {
    return { title: 'Оплат', isPaid: true, showApplicationsCaveat: false, showEstimate: false };
  }
  return { title: 'Заявок B2C', isPaid: false, showApplicationsCaveat: true, showEstimate: true };
}
```

Применить везде: /overview, /goals, /funnel, /report, в снапшоте, в DOCX/PDF.

**Acceptance:**

- [ ] При `e_purchase` /overview KPI = «Оплат: 35», без бейджа «заявка ≠ оплата».
- [ ] При другой цели — «Заявок B2C: 35 · заявка ≠ оплата».

---

## 5. День 3 — UTM coverage (M-004)

`code/backend/src/analytics/utm-coverage.ts`:

```typescript
export function getUtmCoverage(db, from, to, segment): number {
  const total =
    db
      .prepare(
        `SELECT SUM(visits) AS t FROM channel_stats
                             WHERE date BETWEEN ? AND ? AND segment IN (${segmentSqlList(segment)})`,
      )
      .get(from, to)?.t ?? 0;
  const utm =
    db
      .prepare(
        `SELECT SUM(visits) AS u FROM utm_stats
                           WHERE date BETWEEN ? AND ? AND segment IN (${segmentSqlList(segment)})
                             AND utm_source IS NOT NULL AND utm_source != ''`,
      )
      .get(from, to)?.u ?? 0;
  return total > 0 ? clampRatio(utm / total) : 0;
}
```

Tooltip ⓘ с формулой на UI.

**Acceptance:**

- [ ] /traffic не показывает «0.0%», если в utm_stats есть строки.
- [ ] Inv-тест: utm_coverage > 0 при наличии utm_stats.

---

## 6. День 3 — ГОСТ-отчёт DOCX/PDF

### 6.1. Spec `docs/specs/014-report-gost.md`

Структура (15 разделов): 0. Титульный лист (ProductCamp / название работы / период / snapshotId)

1. Реферат (1 страница, ГОСТ)
2. Содержание (TOC с гиперссылками)
3. Введение
4. KPI-обзор + Рисунок 1 (воронка) + блок «🟢/🔴»
5. Трафик по каналам + Рисунок 2 + блок «🟢/🔴»
6. UTM-атрибуция + Рисунок 3 + блок «🟢/🔴»
7. География и устройства + Рисунок 4 + блок «🟢/🔴»
8. Страницы входа/выхода + Таблица 1 + блок «🟢/🔴»
9. B2B-пайплайн + Рисунок 5 + блок «🟢/🔴»
10. AI-нарратив (5 секций: Контекст / Каналы / Поведение / Воронка / Рекомендации)
11. **Гипотезы роста** (AI генерит, формат Воронковой)
12. **Decision Log** (AI генерит, ≥3 решения)
13. Заключение
14. Источники
15. Приложения (полные таблицы CSV-выгрузка)

### 6.2. Стили (ГОСТ Р 7.32-2017)

- Поля: 30/15/20/20 мм (лево/право/верх/низ).
- Шрифт: Arial / Times New Roman 11–12pt.
- Line-spacing: 1.5.
- Нумерация страниц: внизу по центру, скрыта на титульном.
- Подписи: «Рисунок N — Название» (под), «Таблица N — Название» (над).
- TOC: автогенерация, гиперссылки.

### 6.3. Блок «🟢 / 🔴» после каждого графика

Функция `generateRecommendations(chartData, benchmarks)`:

- Вход: данные графика + бенчмарки из `@pca/shared/cr-thresholds.ts`.
- Выход: `{ good: string[], bad: string[] }` (≤5 пунктов в каждом).
- В DOCX — таблица 2×N с shading зелёный/красный.
- В PDF — div с background `#E8F5E9` / `#FFEBEE`.
- В UI превью — два цветных контейнера.

### 6.4. Детерминизм

- Графики рендерятся **server-side** в PNG (puppeteer.screenshot или node-canvas).
- PNG-байты сохраняются **в снапшоте** (base64).
- Render-путь DOCX/PDF не делает HTTP-запросов и LLM-вызовов.
- DOCX и PDF из одного snapshotId — SHA-256 содержимого совпадает (без zip/pdf timestamps).

**Acceptance:**

- [ ] DOCX открывается в Word, соответствует ГОСТ.
- [ ] PDF открывается, соответствует ГОСТ.
- [ ] После каждого графика — блок «🟢/🔴» с осмысленными пунктами.
- [ ] SHA-256 DOCX == SHA-256 PDF для одного snapshotId.

---

## 7. День 4 — Базовая мини-DS (визуал)

### 7.1. Цветовые токены

`code/frontend/src/lib/chart-colors.ts`:

```typescript
export const CHANNEL_COLORS = {
  Direct: '#3B82F6',
  Search: '#10B981',
  Internal: '#8B5CF6',
  Mailing: '#F59E0B',
  Messenger: '#06B6D4',
  SocialNetwork: '#EC4899',
  Ad: '#EF4444',
  Link: '#84CC16',
  Recommendation: '#A855F7',
} as const;

export const METRIC_COLORS = {
  visits: '#64748B',
  applications: '#0EA5E9',
  payments: '#16A34A',
  b2bPipeline: '#A16207',
  gap: '#DC2626',
} as const;
```

### 7.2. Форматирование чисел

`code/frontend/src/lib/format.ts`:

```typescript
const nfRU = new Intl.NumberFormat('ru-RU');
const pctRU = new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 1 });

export const formatNumber = (n: number) => nfRU.format(n);
export const formatPercent = (n: number) => pctRU.format(n);
```

### 7.3. ECharts тема

`code/frontend/src/lib/echarts-theme.ts` — единая тема, регистрация `echarts.registerTheme('pca')`.

### 7.4. Глобальный CSS

- `.tabular-nums` на всех числах (KPI, таблицы).
- Zebra-rows: `odd:bg-slate-50` в таблицах.
- Числовые колонки: `text-right`.

### 7.5. WCAG AA

- Бейджи: `bg-amber-100 text-amber-900` (≥ 7:1), `bg-red-50 text-red-900` (8:1), `bg-emerald-50 text-emerald-900` (8.6:1).
- Светофор: компонент `<TrafficLight status="green" />` с **цветом + иконкой + текстом**.
- Фокус: `focus-visible:ring-2 ring-blue-500 ring-offset-2` глобально.

**Acceptance:**

- [ ] Один и тот же канал на /overview, /traffic, /behavior — одинаковый цвет.
- [ ] Все числа форматированы `Intl.NumberFormat('ru-RU')` (0,7%, 37 649).
- [ ] Lighthouse a11y ≥ 90 на 9 страницах.

---

## 8. День 4 — Мобильная версия

- Playwright project `mobile-iphone-14` (375×812).
- KPI-стрипы: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- Таблицы UTM/страниц на мобиле: карточки (`block sm:table-row`).
- FilterBar: bottom-sheet «Фильтры (3)» при < 768px.
- ECharts: `chart.resize()` на window.resize.

**Acceptance:**

- [ ] e2e mobile проходит на всех 9 страницах.
- [ ] Нет horizontal scroll.

---

## 9. День 5 — Финальные мелочи и документация

### 9.1. Settings sync-text (m-006)

```diff
- Последние 14 дней → SQLite → перегенерация отчётов
+ Период из текущего фильтра ({from} — {to}) → SQLite → перегенерация отчётов
```

### 9.2. GOAL_ID combobox (m-007)

`<select>` → `<Combobox>` (@headlessui/react) + search-input + группировка Активные/Архивные.

### 9.3. Дайджест tooltip (t-009)

«Главное слабое место» — добавить `<Tooltip>` с пояснением.

### 9.4. Документация

- `scripts/sync-versions.ts` — обновляет шапки доков из `package.json`.
- Pre-commit hook (Husky).
- CHANGELOG.md: добавить v2.7.0 с описанием удаления 3 страниц и причин.
- `docs/architecture.md`: убрать упоминания /hypotheses/decisions/b2b как страниц.
- `docs/Руководство_пользователя.md`: переписать раздел «Гипотезы» под AI-генератор в отчёте.
- `qa/README.md` — указать v2.7.0.

### 9.5. format:check (минорный из QA)

```bash
pnpm prettier --write qa/
```

### 9.6. Тесты

- E2E: пользователь генерирует снапшот, AI-анализ, видит гипотезы и решения в отчёте.
- Inv-тест visits consistency.
- Inv-тест utm_coverage > 0.
- Schema-тест: AI-гипотеза проходит валидацию формата Воронковой (zod).

---

## 10. Acceptance — Финальный чек-лист v2.7.0

### 10.1. Технические

- [ ] `pnpm typecheck && pnpm lint && pnpm format:check && pnpm -r coverage && pnpm build && pnpm e2e` — зелёное.
- [ ] coverage 100%.
- [ ] Inv-тесты: visits consistency, utm_coverage > 0, CR ∈ [0,100%].
- [ ] DOCX и PDF одного snapshotId: SHA-256 идентичен.

### 10.2. Функциональные

- [ ] Меню = 9 пунктов (без Гипотез/Решений/B2B).
- [ ] Settings содержит секцию B2B-пайплайн.
- [ ] /report после «Сгенерировать AI-анализ» содержит блоки «Гипотезы роста» и «Decision Log».
- [ ] AI-гипотезы соответствуют формату Воронковой (3 допущения, 2 метода, ICE=I×C×E, светофор, дедлайн).
- [ ] Старые URL /hypotheses /decisions /b2b → 404 или редирект на /report.
- [ ] /overview KPI: «Оплат» при e_purchase, «Заявок» иначе.
- [ ] Bar-chart /traffic показывает все каналы.
- [ ] UTM-coverage > 0% при наличии utm_stats.
- [ ] Числа в Behavior == Goals == Funnel == Snapshot.

### 10.3. ГОСТ-отчёт

- [ ] Структура: Титул → Реферат → TOC → 15 разделов → Заключение → Источники → Приложения.
- [ ] Поля 30/15/20/20 мм, Arial 11pt, line-spacing 1.5, нумерация страниц.
- [ ] После каждого графика — блок «🟢/🔴».
- [ ] Графики PNG (server-side render), не текст.
- [ ] Раздел «Гипотезы роста» с AI-генерацией.
- [ ] Раздел «Decision Log» с ≥3 решениями.

### 10.4. Visual / Design

- [ ] Единая палитра CHANNEL_COLORS / METRIC_COLORS во всех ECharts.
- [ ] Светофор: цвет + иконка + текст.
- [ ] Контраст бейджей ≥ 4.5:1.
- [ ] Числа: `Intl.NumberFormat('ru-RU')` + `tabular-nums`.
- [ ] Иконки lucide-react в навигации.
- [ ] Lighthouse a11y ≥ 90 на 9 страницах.

### 10.5. Mobile

- [ ] e2e iPhone 14 (375×812) проходит на 9 страницах.
- [ ] Нет horizontal scroll.
- [ ] KPI-стрипы 2 колонки.

### 10.6. Документация

- [ ] Все доки на v2.7.0.
- [ ] CHANGELOG описывает удаление 3 страниц.
- [ ] `docs/Руководство_пользователя.md` обновлён.
- [ ] `qa/README.md` указывает финальный отчёт.

### 10.7. Usability метрики (после пилота)

- [ ] Time-to-first-report (новый волонтёр) ≤ 5 минут.
- [ ] Кликов от Overview до экспортированного PDF ≤ 5.
- [ ] Survey команды: «продукт помог достичь N оплат» — обоснованный ответ.

---

## 11. Roadmap

| Релиз      | Состав                                                                               | Сроки    |
| ---------- | ------------------------------------------------------------------------------------ | -------- |
| **v2.7.0** | §1–9 целиком (всё в этом промте)                                                     | 5 дней   |
| **v2.7.1** | bug-fixes по результатам пилота с командой                                           | 3 дня    |
| **v3.0.0** | новые графики (cohort, sankey, what-if), event tracking, weekly digest, Slack-bot DL | 2 недели |

После v2.7.0 — **🟢 GO для пилота**.
После v2.7.1 — **🟢 production** для команды ProductCamp.

---

## 12. Сводка дефектов из всех QA-прогонов

| ID                | Sev   | Описание                                        | План фикса |
| ----------------- | ----- | ----------------------------------------------- | ---------- |
| Удалить страницы  | —     | /hypotheses, /decisions, /b2b не нужны          | §1         |
| M-002             | Major | Визиты Behavior 4 984 ≠ Goals 4 912             | §2         |
| M-003             | Major | Bar-chart /traffic обрезан до 3 каналов         | §3         |
| M-005             | Major | KPI «Заявок B2C» при e_purchase                 | §4         |
| M-004             | Major | UTM-coverage 0% при наличии utm_stats           | §5         |
| ГОСТ DOCX/PDF     | Major | Нет ГОСТ-форматирования + блоков 🟢/🔴          | §6         |
| Визуал            | Major | Разнобой палитры, шрифтов, форматов             | §7         |
| Mobile            | Major | Не тестирован на 375×812                        | §8         |
| m-006/m-007/t-009 | Minor | Settings text, GOAL_ID search, tooltip          | §9         |
| format:check      | Minor | qa/\*.md не Prettier'нуты                       | §9.5       |
| WCAG AA           | Major | Контраст бейджей, светофор без текста           | §7.5       |
| Документация      | Major | Старые упоминания /hypotheses/decisions/b2b     | §9.4       |
| Coverage          | Major | sandbox arm64 vs darwin (известное ограничение) | окружение  |

**Закрыто в предыдущих релизах (не править):**

- ✅ B-001 typecheck (CLEAR → clear)
- ✅ B-002 visits не сходятся (частично, осталось M-002)
- ✅ B-003 CR > 100% (clampRatio)
- ✅ C-006 UTM-coverage один источник (но значение 0% — M-004)
- ✅ Дубли channel_stats
- ✅ ESLint 27 ошибок
- ✅ Версии в шапках доков (sync на 2.6.0)

---

## 13. Что НЕ делаем (явный антирамок)

- **НЕ создаём** stepper-форму гипотезы вручную — отменено решением пользователя.
- **НЕ делаем** kanban отдельной страницей — переносим в Settings.
- **НЕ добавляем** /admin/adoption в этом релизе (отложено в v3.0.0).
- **НЕ внедряем** cohort heatmap / sankey / what-if — отложено в v3.0.0.
- **НЕ переписываем** под мониторинг продукт-аналитики — отложено.

---

## 14. После v2.7.0 — пилот с командой

1. Установить локально у Лизы и 2 волонтёров.
2. За 1 неделю — каждый формирует ≥3 отчёта (срез + AI-анализ).
3. ≥1 решение зафиксировано в Decision Log внутри отчёта.
4. Отчёт DOCX/PDF показан стейкхолдерам, замечания собраны.
5. Survey: «продукт помог достичь N оплат» — обоснованный ответ.

🟢 **GO для прода** — если все 5 пунктов зелёные.

---

> «Меньше страниц — меньше дыр в логике. AI делает работу, человек принимает решения.»
