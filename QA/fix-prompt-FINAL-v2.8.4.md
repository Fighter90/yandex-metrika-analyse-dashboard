# Fix-Prompt FINAL v2.8.4 — финальные правки перед production

> Целевой агент: **Claude Code** в репозитории `metrika_analyse_dashboard`.
> Базис: `qa/qa-report-FINAL-v2.8.3.md`. Цель: **2-3 дня** работы → production-ready.
>
> v2.8.3 уже **🟢 GO для пилота** — этот промт закрывает последние 1 Major + 4 Minor
> и добавляет offline-проверки. После v2.8.4 — **100% production** для команды.

---

## 🎯 Скоуп

| ID                   | Sev   | Описание                                             | День |
| -------------------- | ----- | ---------------------------------------------------- | ---- |
| **M-004**            | Major | UTM-coverage = 0% при заполненном utm_stats          | 1    |
| **M-DET**            | Major | DOCX/PDF SHA-256 не детерминистичны (zip-timestamps) | 1    |
| **C-005**            | Minor | Дубли URL в «Топ страниц входа»                      | 1    |
| **m-007**            | Minor | GOAL_ID — обычный input вместо combobox              | 2    |
| **m-snapshot-label** | Minor | KPI «Заявки B2C» в снапшоте при e_purchase           | 2    |
| **m-api-key**        | Minor | Anthropic key в UI пустой placeholder                | 2    |
| **offline-docx**     | —     | ГОСТ-аудит DOCX/PDF в Word                           | 3    |
| **mobile-pass**      | —     | 375×812 e2e через Playwright                         | 3    |
| **a11y-audit**       | —     | axe-core headless on 9 страницах                     | 3    |

---

## 1. День 1 — Critical fixes

### 1.1. M-004 — UTM-coverage расчёт из utm_stats

**Где:** `code/backend/src/analytics/utm-coverage.ts` (или там, где сейчас).

**Проблема:** значение 0.0% показывается на /overview, /traffic, в превью отчёта, при том, что UTM-таблица заполнена (tg/infopartner/codedaria и т.д.).

**Фикс:**

```typescript
export function getUtmCoverage(db, from, to, segment): number {
  const total =
    db
      .prepare(
        `
    SELECT SUM(visits) AS t FROM channel_stats
    WHERE date BETWEEN ? AND ? AND segment IN (${segmentSqlList(segment)})
  `,
      )
      .get(from, to)?.t ?? 0;
  const utm =
    db
      .prepare(
        `
    SELECT SUM(visits) AS u FROM utm_stats
    WHERE date BETWEEN ? AND ? AND segment IN (${segmentSqlList(segment)})
      AND utm_source IS NOT NULL AND utm_source != ''
  `,
      )
      .get(from, to)?.u ?? 0;
  return total > 0 ? clampRatio(utm / total) : 0;
}
```

**Acceptance:**

- [ ] /overview бейдж UTM-coverage > 0% (например 25%).
- [ ] /traffic тот же бейдж.
- [ ] Inv-тест: `expect(getUtmCoverage(db, from, to, segment)).toBeGreaterThan(0)`.
- [ ] Tooltip ⓘ «как считается» — формула.

### 1.2. M-DET — Детерминизм DOCX/PDF

**Проблема:** 2 генерации одного snapshotId → разные SHA-256 файлов.

**Контент детерминистичен** (PNG-имена-хэши одинаковые). Проблема в metadata.

**Опция А — зафиксировать timestamps:**

```typescript
// DOCX
const zip = new JSZip();
zip.file('word/document.xml', xml, { date: new Date(0) });
const buf = await zip.generateAsync({
  type: 'arraybuffer',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // фиксированная дата для всех файлов в архиве
});

// PDF — puppeteer
await page.pdf({
  path: out,
  preferCSSPageSize: true,
  // отключить metadata.CreationDate / ModDate если puppeteer позволяет
});
// либо постобработка через qpdf:
// qpdf --linearize --object-streams=disable input.pdf output.pdf
```

**Опция B — обновить спеку:**

- В `CLAUDE.md` явно зафиксировать: «детерминистичен **контент** (PNG-имена, текст), не файловый SHA-256».
- Inv-тест проверяет PNG-хэши и хэш document.xml, а не весь файл.

**Acceptance:**

- [ ] Тест: `expect(extractDocumentXml(docx1)).toEqual(extractDocumentXml(docx2))`.
- [ ] Тест: `expect(pngHashes(docx1)).toEqual(pngHashes(docx2))`.

### 1.3. C-005 — Дедупликация URL страниц входа

**Где:** /overview блок «Топ страниц входа» — `https://productcamp.ru/` повторяется 4 раза.

**Причина:** в `page_stats` URL хранятся с фрагментами/query (например, `?ref=a`, `#popup`).

**Фикс:** в `code/backend/src/etl/pages.ts` нормализовать URL:

```typescript
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    // убираем query и fragment, lowercase host
    return u.protocol + '//' + u.host.toLowerCase() + u.pathname;
  } catch {
    return url;
  }
}
// При INSERT — нормализовать, оригинальный URL хранить в raw_url.
```

**Миграция существующих данных:**

```sql
-- 010_normalize_page_urls.sql
UPDATE page_stats SET url = (
  -- нормализация через application-level migration (см. scripts/normalize-pages.ts)
);
```

**Acceptance:**

- [ ] `https://productcamp.ru/` появляется ОДИН раз в «Топ страниц входа», цифры агрегированы.
- [ ] `https://productcamp.ru/summer2026` — отдельная запись.

---

## 2. День 2 — Minor + UI polish

### 2.1. m-007 — GOAL_ID combobox с поиском

**Где:** `code/frontend/src/routes/settings.tsx` — input number поменять на Combobox.

**Реализация:**

```tsx
import { Combobox } from '@headlessui/react';
import { goalsQuery } from '@/api/goals';

function GoalCombobox({ value, onChange }) {
  const { data: goals = [] } = useQuery(goalsQuery);
  const [query, setQuery] = useState('');
  const active = goals.filter((g) => !g.isArchived);
  const archived = goals.filter((g) => g.isArchived);
  const filtered = (list) => list.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={value} onChange={onChange}>
      <Combobox.Input
        displayValue={(id) => goals.find((g) => g.id === id)?.name ?? ''}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Combobox.Options>
        <div className="text-xs font-medium uppercase">Активные ({active.length})</div>
        {filtered(active).map((g) => (
          <Combobox.Option key={g.id} value={g.id}>
            {g.name} <Badge>{g.type}</Badge>
          </Combobox.Option>
        ))}
        <div className="text-xs font-medium uppercase mt-2">Архивные ({archived.length})</div>
        {filtered(archived).map((g) => (
          <Combobox.Option key={g.id} value={g.id}>
            {g.name} <Badge>{g.type}</Badge>
          </Combobox.Option>
        ))}
      </Combobox.Options>
    </Combobox>
  );
}
```

**Acceptance:**

- [ ] /settings GOAL_ID — combobox с search-input.
- [ ] Группы «Активные» / «Архивные» с counter.
- [ ] Type bage (e_purchase / messenger / form / ...).

### 2.2. m-snapshot-label — formatGoalLabel в KPI снапшота

**Где:** превью отчёта в /report и DOCX/PDF.

**Фикс:** в `code/backend/src/report/snapshot.ts` использовать `formatGoalLabel(primaryGoal)`:

```typescript
const goalLabel = formatGoalLabel(primaryGoal);
snapshot.kpi.applicationsLabel = goalLabel.title; // "Оплат" или "Заявок B2C"
snapshot.kpi.showCaveat = goalLabel.showApplicationsCaveat;
```

**В превью UI:**

```tsx
<Kpi
  label={snapshot.goalLabel.title}
  value={snapshot.kpi.applications}
  caveat={snapshot.goalLabel.showApplicationsCaveat ? 'заявка ≠ оплата' : undefined}
/>
```

**Acceptance:**

- [ ] При primary_goal `e_purchase` → KPI «ОПЛАТ 50» без бейджа «заявка ≠ оплата».
- [ ] При other goal → «ЗАЯВКИ B2C 50 · заявка ≠ оплата».
- [ ] Идентично на /overview, /goals, /report, в DOCX, PDF.

### 2.3. m-api-key — показать маску Anthropic key в UI

**Где:** `code/frontend/src/routes/settings.tsx`.

**Сейчас:** `<input type="password" placeholder="sk-ant-..." value="" />` (пусто).

**Фикс:** при mount читать /api/settings и заполнить input маской:

```tsx
const { data: settings } = useQuery(['settings'], fetchSettings);
const [aiKey, setAiKey] = useState('');
useEffect(() => {
  if (settings?.ANTHROPIC_API_KEY && !aiKey) {
    setAiKey(settings.ANTHROPIC_API_KEY); // "sk-a****AA"
  }
}, [settings]);

// При сохранении — не отправлять, если значение содержит ****
const handleSave = () => {
  const body = { ...other };
  if (!aiKey.includes('****')) body.ANTHROPIC_API_KEY = aiKey;
  postSettings(body);
};
```

**Acceptance:**

- [ ] /settings показывает «sk-a\*\*\*\*AA» в Anthropic key input.
- [ ] При сохранении без изменения — ключ не отправляется обратно.
- [ ] При изменении — отправляется новое значение, сохраняется.

---

## 3. День 3 — Offline & a11y аудит

### 3.1. offline-docx — ручной аудит ГОСТ

**Шаги:**

1. Сгенерировать снапшот через UI (как уже сделано).
2. Скачать DOCX через `Export DOCX`.
3. Открыть в **MS Word** или **LibreOffice Writer**.
4. Проверить (с скриншотами):
   - [ ] **Поля 30/15/20/20мм** (Layout → Margins → Custom).
   - [ ] **Шрифт Arial / Times New Roman 11-12pt** (Home → Font).
   - [ ] **Line-spacing 1.5** (Paragraph → Spacing → Line Spacing).
   - [ ] **Нумерация страниц** внизу по центру (Insert → Header & Footer).
   - [ ] **Титульная страница** содержит: ProductCamp / название работы / период / snapshotId / год.
   - [ ] **TOC** (Содержание) с гиперссылками — клик ведёт на раздел.
   - [ ] **Подписи рисунков** «Рисунок N — Название» под каждым PNG.
   - [ ] **Подписи таблиц** «Таблица N — Название» над каждой таблицей.
   - [ ] **3 PNG-графика** видны (бар, воронка, микс) — не заглушки.
   - [ ] **Блок «🟢 Корректно / 🔴 Внимание / 💡 Рекомендация»** после каждого графика — с цветным shading.
   - [ ] **Раздел «Гипотезы роста»** (AI) с ≥3 гипотезами в формате Воронковой.
   - [ ] **Раздел «Decision Log»** с ≥3 решениями.
   - [ ] **AI-нарратив** в HTML без сырых MD-тегов (####, \*\*).
   - [ ] **Отсутствуют пустые блоки-заполнители**.
   - [ ] **Выравнивание по ширине** в основном тексте.

5. То же для PDF (Acrobat Reader / Preview).

**Acceptance:**

- [ ] 12 пунктов выше проверены и зафиксированы в `qa/offline-audit-v2.8.4.md` со скриншотами.

### 3.2. mobile-pass — Playwright iPhone 14

**Файл:** `e2e/mobile.spec.ts`:

```typescript
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['iPhone 14'] });

const pages = [
  '/',
  '/traffic',
  '/behavior',
  '/funnel',
  '/goals',
  '/report',
  '/history',
  '/settings',
  '/help',
];

for (const path of pages) {
  test(`mobile: ${path} renders without horizontal scroll`, async ({ page }) => {
    await page.goto('http://localhost:5173' + path);
    await page.waitForLoadState('networkidle');
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
}

test('mobile: hamburger menu opens all 9 items', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.locator('[data-mobile-menu-trigger]').click();
  const items = await page.locator('[data-nav-item]').count();
  expect(items).toBe(9);
});

test('mobile: filter bottom-sheet opens and closes', async ({ page }) => {
  await page.goto('http://localhost:5173/');
  await page.locator('button:has-text("Фильтры")').click();
  await expect(page.locator('[role=dialog]')).toBeVisible();
  await page.locator('button:has-text("Готово")').click();
  await expect(page.locator('[role=dialog]')).not.toBeVisible();
});
```

**Acceptance:**

- [ ] `pnpm e2e --project=mobile-iphone-14` зелёный.
- [ ] 0 страниц с horizontal scroll.

### 3.3. a11y-audit — axe-core

**Файл:** `e2e/a11y.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

const pages = [
  '/',
  '/traffic',
  '/behavior',
  '/funnel',
  '/goals',
  '/report',
  '/history',
  '/settings',
  '/help',
];

for (const path of pages) {
  test(`a11y: ${path} — 0 WCAG 2 AA violations`, async ({ page }) => {
    await page.goto('http://localhost:5173' + path);
    await injectAxe(page);
    await checkA11y(page, undefined, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
      detailedReport: true,
    });
  });
}
```

**Acceptance:**

- [ ] `pnpm e2e --grep "a11y"` — 0 violations на 9 страницах.
- [ ] Lighthouse a11y ≥ 90 на каждой странице (CI lighthouse-ci).

---

## 4. Финальный чек-лист приёмки v2.8.4

### Технические

- [ ] `pnpm typecheck && pnpm lint && pnpm format:check && pnpm -r coverage && pnpm build && pnpm e2e` — зелёное.
- [ ] coverage 100%.
- [ ] CHANGELOG.md содержит запись v2.8.4 со списком фиксов.
- [ ] `scripts/sync-versions.ts` — все шапки на 2.8.4.

### Дефекты закрыты

- [ ] M-004 UTM-coverage > 0% при наличии utm_stats.
- [ ] M-DET — спека/тесты обновлены под content-deterministic.
- [ ] C-005 — дубли URL устранены.
- [ ] m-007 — GOAL_ID combobox с search и группами.
- [ ] m-snapshot-label — formatGoalLabel применён в снапшоте.
- [ ] m-api-key — маска в UI.

### Offline / a11y / mobile

- [ ] Offline DOCX/PDF аудит — 12 пунктов ГОСТ проверены, скриншоты в `qa/`.
- [ ] Playwright mobile-iphone-14 зелёный.
- [ ] Playwright a11y — 0 WCAG 2 AA violations.
- [ ] Lighthouse a11y ≥ 90 на 9 страницах.

### Production readiness

- [ ] Все 6 дефектов из qa-report-FINAL-v2.8.3 закрыты.
- [ ] Полный e2e регресс по чек-листу 200+ пунктов — pass rate ≥ 95%.
- [ ] Пилот с 3 пользователями проведён успешно.
- [ ] Survey: «продукт помог достичь N оплат» — обоснованный ответ.

---

## 5. Roadmap после v2.8.4

| Релиз      | Состав                                                                                                             | Сроки    |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| **v2.8.4** | 1 Major + 4 Minor из этого промта + offline/mobile/a11y                                                            | 2-3 дня  |
| **v2.9.0** | Пилот feedback bug-fixes                                                                                           | 1 неделя |
| **v3.0.0** | Новые графики (cohort heatmap, sankey UTM→landing, what-if simulator), event tracking, weekly digest, Slack-bot DL | 2 недели |

После **v2.8.4** = **🟢 production-ready** для команды ProductCamp.

---

## 6. Что НЕ в скоупе v2.8.4

- Изменение методологии (Воронкова / ICE / DD) — стабильно.
- Удаление/добавление страниц — структура зафиксирована (9 страниц).
- AI prompt изменения — Anthropic-генератор работает.
- B2B kanban на отдельной странице — переехал в Settings (collapse).

---

> «Финальные мелочи — это разница между «работает» и «работает идеально».»
