# Fix-Prompt v2.8.6 — polish после production-релиза v2.8.5

> Базис: `qa/qa-report-v2.8.5.md` (🟢 GO для прода).
> Скоуп: финальный полишинг + offline-аудит. Не блокирует production.
> Срок: **1-2 дня**.

---

## 🎯 Открытые дефекты v2.8.5 (все Minor)

| ID                     | Sev   | Описание                                                           | День |
| ---------------------- | ----- | ------------------------------------------------------------------ | ---- |
| **M-DET**              | Minor | DOCX/PDF SHA-256 не побайтово (zip/pdf timestamps)                 | 1    |
| **C-005**              | Minor | Дубли URL «https://productcamp.ru/» в Топ страниц входа            | 1    |
| **m-007**              | Minor | GOAL_ID в Settings — input number, не combobox                     | 1    |
| **offline-docx**       | —     | ГОСТ-аудит DOCX/PDF в Word                                         | 2    |
| **mobile-pass**        | —     | Playwright iPhone 14 e2e                                           | 2    |
| **a11y-audit**         | —     | axe-core headless на 9 страницах                                   | 2    |
| **ai-live-validation** | —     | Запустить POST /api/report/insights, проверить 6 секций HTML       | 2    |
| **sync-progress-live** | —     | Нажать «Обновить данные из Метрики», проверить 10 стадий прогресса | 2    |

---

## 1. День 1 — Code fixes

### 1.1. M-DET — Обновить спеку детерминизма

**Где:** `CLAUDE.md`, `docs/anti-hallucination.md`.

**Сейчас:** «один snapshotId → идентичный контент DOCX/PDF (zip/pdf-таймстемпы — known limitation)».

**Фикс:**

- Явно зафиксировать в спеке: **content-determinism** (PNG-хэши + document.xml-хэш), не файловый SHA-256.
- Inv-тест в `code/backend/tests/report/determinism.test.ts`:

```typescript
import JSZip from 'jszip';

async function extractContent(docxBuf: ArrayBuffer) {
  const zip = await JSZip.loadAsync(docxBuf);
  const documentXml = await zip.file('word/document.xml').async('string');
  const pngs = await Promise.all(
    Object.keys(zip.files)
      .filter((k) => k.startsWith('word/media/') && k.endsWith('.png'))
      .map(async (k) => ({
        name: k,
        sha256: await sha256(await zip.file(k).async('arraybuffer')),
      })),
  );
  return { documentXmlHash: await sha256(documentXml), pngs };
}

it('content-determinism: same snapshotId → same XML + PNGs', async () => {
  const id = await generateSnapshot(testData);
  const doc1 = await downloadDocx(id);
  const doc2 = await downloadDocx(id);
  const c1 = await extractContent(doc1);
  const c2 = await extractContent(doc2);
  expect(c1.documentXmlHash).toBe(c2.documentXmlHash);
  expect(c1.pngs).toEqual(c2.pngs);
});
```

**Опционально (если хотим побайтовый SHA-256):**

- В JSZip передавать `date: new Date(0)` для всех файлов.
- В puppeteer `page.pdf()` обработать через `qpdf --linearize --object-streams=disable`.

### 1.2. C-005 — Нормализация URL страниц входа

`code/backend/src/etl/pages.ts`:

```typescript
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname}`;
  } catch {
    return url;
  }
}
// При записи в page_stats: storeUrl = normalizeUrl(raw)
// rawUrl = raw (для отладки)
```

Миграция:

```typescript
// scripts/dedupe-pages.ts
const rows = db.prepare('SELECT * FROM page_stats').all();
const groups = new Map<string, any[]>();
for (const r of rows) {
  const key = `${r.date}|${normalizeUrl(r.url)}|${r.segment}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}
db.exec('DELETE FROM page_stats');
const insert = db.prepare(
  'INSERT INTO page_stats (date, url, visits, bounce_rate, goal_reaches, segment) VALUES (?,?,?,?,?,?)',
);
for (const [key, items] of groups) {
  const [date, url, segment] = key.split('|');
  const visits = items.reduce((s, r) => s + r.visits, 0);
  const bounce = items.reduce((s, r) => s + r.bounce_rate * r.visits, 0) / visits;
  const reaches = items.reduce((s, r) => s + r.goal_reaches, 0);
  insert.run(date, url, visits, bounce, reaches, segment);
}
```

**Acceptance:**

- [ ] `https://productcamp.ru/` появляется ОДИН раз в Топ страниц входа.
- [ ] `https://productcamp.ru/summer2026` — отдельной записью.
- [ ] Inv-тест: `SELECT COUNT(*) FROM page_stats GROUP BY date, url, segment HAVING COUNT(*) > 1` = 0.

### 1.3. m-007 — GOAL_ID Combobox с @headlessui

`code/frontend/src/routes/settings.tsx`:

```tsx
import { Combobox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from 'lucide-react';

function GoalCombobox({ value, onChange }) {
  const { data: goals = [] } = useQuery({ queryKey: ['goals'], queryFn: fetchGoals });
  const [query, setQuery] = useState('');
  const active = goals.filter((g) => !g.isArchived);
  const archived = goals.filter((g) => g.isArchived);
  const filter = (list) =>
    query === '' ? list : list.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Input
          className="w-full rounded-md border px-3 py-2 focus-visible:ring-2 ring-blue-500"
          displayValue={(id) => goals.find((g) => g.id === id)?.name ?? '0 — Авто-определение'}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти цель..."
        />
        <Combobox.Button className="absolute inset-y-0 right-0 px-2">
          <ChevronUpDownIcon className="h-5 w-5" />
        </Combobox.Button>
        <Combobox.Options className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md bg-white shadow-lg">
          <Combobox.Option value={0} className="px-3 py-2 hover:bg-blue-50">
            0 — Авто-определение
          </Combobox.Option>
          <div className="px-3 py-1 text-xs font-bold uppercase text-slate-500">
            Активные ({active.length})
          </div>
          {filter(active).map((g) => (
            <Combobox.Option key={g.id} value={g.id} className="px-3 py-2 hover:bg-blue-50">
              {g.name} <span className="text-xs text-slate-500">[{g.type}]</span>
            </Combobox.Option>
          ))}
          <div className="px-3 py-1 text-xs font-bold uppercase text-slate-500">
            Архивные ({archived.length})
          </div>
          {filter(archived).map((g) => (
            <Combobox.Option
              key={g.id}
              value={g.id}
              className="px-3 py-2 hover:bg-blue-50 text-slate-500"
            >
              {g.name} <span className="text-xs">[{g.type}]</span>
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </div>
    </Combobox>
  );
}
```

**Acceptance:**

- [ ] /settings GOAL_ID — combobox с search-input и иконкой dropdown.
- [ ] Группы «Активные (N)» / «Архивные (N)» с counter.
- [ ] Тип цели как badge.
- [ ] При выборе сохраняется в settings.

---

## 2. День 2 — Offline аудит + e2e

### 2.1. offline-docx — ручная проверка ГОСТ

1. Скачать DOCX (`Export DOCX` на /report).
2. Открыть в MS Word или LibreOffice Writer.
3. Проверить (со скриншотами в `qa/offline-audit-v2.8.6.md`):
   - [ ] Поля 30/15/20/20 мм (Layout → Margins).
   - [ ] Шрифт Arial / Times New Roman 11–12pt.
   - [ ] Line-spacing 1.5.
   - [ ] Нумерация страниц внизу по центру.
   - [ ] Титульная страница: ProductCamp / название / период / snapshotId / год.
   - [ ] TOC с гиперссылками — клик ведёт на раздел.
   - [ ] Подписи рисунков «Рисунок N — Название».
   - [ ] Подписи таблиц «Таблица N — Название».
   - [ ] 3 PNG-графика видны.
   - [ ] Блок «🟢/🔴» после каждого графика — с цветным shading.
   - [ ] Раздел «Гипотезы роста» (≥3 в формате Воронковой).
   - [ ] Раздел «Decision Log» (≥3 решения).
   - [ ] AI-нарратив без сырых MD-тегов (####, \*\*).
   - [ ] Нет пустых блоков-заполнителей.
   - [ ] Выравнивание по ширине.
4. То же для PDF (Acrobat Reader / Preview).

### 2.2. mobile-pass — Playwright iPhone 14

`e2e/mobile.spec.ts`:

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
  test(`mobile: ${path} no horizontal scroll`, async ({ page }) => {
    await page.goto('http://localhost:5173' + path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
}
```

### 2.3. a11y-audit — axe-core

`e2e/a11y.spec.ts`:

```typescript
import { test } from '@playwright/test';
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
  test(`a11y: ${path}`, async ({ page }) => {
    await page.goto('http://localhost:5173' + path);
    await injectAxe(page);
    await checkA11y(page, undefined, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } });
  });
}
```

### 2.4. ai-live-validation — POST /api/report/insights

1. Создать снапшот.
2. POST `/api/report/insights {snapshotId}`.
3. Ожидать ~40-70 с.
4. Проверить:
   - [ ] Ответ содержит 6 секций (executive_summary, channels, behavior, funnel, hypotheses, conclusion).
   - [ ] Каждая — валидный HTML без сырых MD-тегов (`####`, `**`, `1.`).
   - [ ] Сохранено в snapshot.aiInsights.
   - [ ] При повторном GET snapshot — insights остались.

### 2.5. sync-progress-live — UI прогресс-бар

1. Открыть /settings.
2. Нажать «Обновить данные из Метрики».
3. Сделать скриншот каждой стадии (10 стадий заявлены).
4. Проверить:
   - [ ] Каждая стадия с % и описанием.
   - [ ] По завершении кнопка снова активна.
   - [ ] Дашборд показывает новые данные после refetch.

---

## 3. Финальный чек-лист v2.8.6

- [ ] `pnpm typecheck && lint && format:check && coverage && build && e2e` зелёное.
- [ ] M-DET спека обновлена + content-determinism inv-тест.
- [ ] C-005 нормализация URL применена + миграция данных.
- [ ] m-007 combobox в Settings.
- [ ] Offline-аудит DOCX/PDF в `qa/offline-audit-v2.8.6.md`.
- [ ] Mobile e2e zelёное.
- [ ] axe-core 0 violations.
- [ ] AI live validation pass.
- [ ] Sync progress live pass.
- [ ] CHANGELOG v2.8.6 + sync-versions.
- [ ] **Пилот с командой ProductCamp** — Лиза + 2 волонтёра, 1 неделя, feedback собран.

После v2.8.6 — **100% production, готово к ProductCamp 2026**.

---

> «v2.8.5 — production. v2.8.6 — perfect.»
