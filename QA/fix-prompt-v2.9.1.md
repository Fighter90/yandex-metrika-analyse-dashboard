# Fix-Prompt v2.9.1 — финальная полировка отчётов (AI-DOCX)

> Дата: 2026-05-29. Базис: `qa/qa-offline-docx-ai-v2.9.0.md`.
> v2.9.0 в production без AI; этот промт закрывает оставшиеся 4 дефекта в AI-нарративе
>
> - 5 исторических Minor + 4 ручные верификации. Срок: **3–4 дня**. Блокеров нет.

---

## 📋 Скоуп

| ID                   | Sev      | Источник             | Описание                                                                       |
| -------------------- | -------- | -------------------- | ------------------------------------------------------------------------------ |
| **D-EMOJI**          | 🟡 Major | offline-audit-v2.9.0 | 22 AI-заголовка с эмодзи (🔴/✅/🟡/⚠️) в начале                                |
| **D-DOUBLE-NUM**     | 🟡 Major | offline-audit-v2.9.0 | TOC: «11. 1. Где мы сейчас» — двойная нумерация                                |
| **D-VERBOSE**        | 🟢 Minor | offline-audit-v2.9.0 | 776 параграфов с AI vs 200 без — длинные нарративы                             |
| **D-EMPTY-PAGE**     | 🟢 Minor | offline-audit-v2.9.0 | 10 подряд пустых параграфов на титульной странице                              |
| **M-DET**            | 🟢 Minor | carried              | SHA-256 файлов разный (zip-таймстемпы); контент детерм.                        |
| **C-005**            | 🟢 Minor | carried              | Дубли URL `https://productcamp.ru/` в Топ страниц входа                        |
| **m-007**            | 🟢 Minor | carried              | GOAL_ID — input number, не combobox (уже исправлено в коде, верифицировать UX) |
| **m-snapshot-label** | 🟢 Minor | carried              | KPI снапшота лейбл «Заявки B2C» при e_purchase                                 |
| **m-api-key**        | 🟢 Minor | carried              | Anthropic API Key — пустое поле, нужна видимая маска                           |
| offline-docx         | —        | manual               | Ручная ГОСТ-проверка DOCX/PDF в Word                                           |
| mobile-pass          | —        | manual               | Playwright iPhone 14 e2e на 9 страницах                                        |
| a11y-audit           | —        | manual               | axe-core headless: 9 страниц × 0 violations                                    |
| ai-live-validation   | —        | manual               | POST /api/report/insights → 6 секций → snapshot.aiInsights                     |

---

## 🔴 Часть 1 — Чистка AI-нарратива

### 1.1. D-EMOJI — Удаление эмодзи в начале заголовков

**Файл:** `code/shared/src/report-sections.ts` — функция `sanitizeAiLine` (строка ≈333).

**Сейчас:** `sanitizeAiLine` снимает только `#{1,6}` и `>` префиксы; эмодзи остаются.

**Фикс:**

```typescript
const LEADING_EMOJI_RE =
  /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F600}-\u{1F64F}\u{1FA70}-\u{1FAFF}️‍]+\s*/u;

const LEADING_NUM_RE = /^(?:\d+[.\)]|Шаг\s+\d+\.|Раздел\s+\d+\.)\s*/iu;

/**
 * Strip markdown noise + leading emoji/numbering from AI-narrative lines.
 * Defence-in-depth: AI prompt also forbids these markers (see ai-insights.ts AI_FORMAT_RULES),
 * but the sanitizer guarantees the DOCX/PDF stays clean even if the model regresses.
 */
function sanitizeAiLine(line: string): string {
  return line
    .replace(/^\s*#{1,6}\s+/, '')
    .replace(/^\s*>\s?/, '')
    .replace(LEADING_EMOJI_RE, '')
    .replace(LEADING_NUM_RE, '')
    .trimEnd();
}
```

**Inv-тесты** (`code/shared/src/report-sections.test.ts`):

```typescript
import { reportSections } from './report-sections';

describe('sanitizeAiLine via reportSections', () => {
  const baseSnap = makeSnapshot();

  it('strips leading emoji from AI headings', () => {
    const snap = { ...baseSnap, aiNarrative: '## 🔴 Ключевые риски\n\nТекст 🔴 в теле OK.' };
    const sections = reportSections(snap);
    const ai = sections.find((s) => s.heading.includes('Ключевые риски'));
    expect(ai?.heading).toBe('Ключевые риски'); // эмодзи убран
    expect(ai?.lines.join(' ')).toContain('🔴'); // в теле остался
  });

  it('strips AI numbering prefix from headings', () => {
    const snap = { ...baseSnap, aiNarrative: '## 1. Где мы сейчас\n\np' };
    const sections = reportSections(snap);
    expect(sections.find((s) => s.heading === 'Где мы сейчас')).toBeTruthy();
  });

  it('strips combined emoji + numbering', () => {
    const snap = { ...baseSnap, aiNarrative: '## 🟢 1. Анализ каналов\n\np' };
    const sections = reportSections(snap);
    expect(sections.find((s) => s.heading === 'Анализ каналов')).toBeTruthy();
  });
});
```

**Acceptance:**

- [ ] DOCX-аудит: `headingsStartingWithEmoji = 0` (было 22).
- [ ] Regex `/^[🟢🔴🟡✅⚠️❌]/` по всем `w:pStyle="Heading"` параграфам → 0 совпадений.
- [ ] Эмодзи внутри абзацев сохраняются (как акценты).

---

### 1.2. D-DOUBLE-NUM — Устранение двойной нумерации AI-секций

**Файл 1 — AI prompt:** `code/backend/src/report/ai-insights.ts`, константа `AI_FORMAT_RULES`.

**Сейчас:**

```typescript
export const AI_FORMAT_RULES =
  'ФОРМАТ ВЫВОДА (строго): пиши обычным текстом, абзацами. НЕ используй Markdown-заголовки ' +
  '(#, ##, ###, ####). НЕ нумеруй собственные подзаголовки («1.», «2.» как заголовки) — ' +
  'сквозную нумерацию разделов добавляет сам отчёт. НЕ начинай строки с эмодзи. ' +
  'Для перечислений используй строки, начинающиеся с «— ». ' +
  'Жирный — **двойными звёздочками**. Никаких HTML-тегов (<p>, <br> и т.п.).';
```

Правила уже корректны, но модель иногда регрессирует. Усилить:

```typescript
export const AI_FORMAT_RULES =
  'ФОРМАТ ВЫВОДА (строго):\n' +
  '1. Пиши обычным текстом, абзацами. НЕ используй Markdown-заголовки (#, ##, ###, ####).\n' +
  '2. КРИТИЧНО: НЕ нумеруй собственные подзаголовки. Запрещено писать «1. Где мы сейчас», ' +
  '«2. Анализ», «Шаг 1. …», «Раздел 1. …». Заголовок — только смысловая тема: «Где мы сейчас», ' +
  '«Анализ каналов». Сквозную нумерацию разделов добавляет сам отчёт.\n' +
  '3. НЕ начинай строки с эмодзи. Эмодзи допустимы ТОЛЬКО внутри абзаца как акцент.\n' +
  '4. Для перечислений используй строки, начинающиеся с «— ».\n' +
  '5. Жирный — **двойными звёздочками**. Никаких HTML-тегов (<p>, <br> и т.п.).\n' +
  '6. ЛИМИТ ОБЪЁМА: каждый раздел ≤ 7 абзацев, каждый абзац ≤ 4-5 предложений.';
```

**Файл 2 — пост-парс защита:** `code/shared/src/report-sections.ts` — `sanitizeAiLine` уже снимает
`LEADING_NUM_RE` (см. §1.1).

**Acceptance:**

- [ ] TOC сгенерированного DOCX: regex `/^\d+\.\s+\d+\./` → 0 матчей.
- [ ] AI-секции имеют осмысленные заголовки без префикса «1.», «Шаг 1.», «Раздел 1.».

---

### 1.3. D-VERBOSE — Сократить AI-нарратив

**Файл:** `code/shared/src/report-sections.ts` — функция `parseChunkedNarrative` (строка ≈56).

**Сейчас:** parseChunkedNarrative собирает ВСЕ строки между `## ` без лимита.

**Фикс — добавить лимит параграфов на AI-секцию:**

```typescript
const AI_MAX_LINES_PER_SECTION = 35; // ≈7 абзацев по 4-5 строк
const AI_TRUNCATION_NOTE =
  '…[раздел сокращён по лимиту объёма; полная версия — в snapshot.aiNarrative]';

function applyAiLineLimit(lines: string[]): string[] {
  if (lines.length <= AI_MAX_LINES_PER_SECTION) return lines;
  return [...lines.slice(0, AI_MAX_LINES_PER_SECTION), '', AI_TRUNCATION_NOTE];
}

function parseChunkedNarrative(narrative: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const lines = narrative.split('\n');
  let currentHeading = '';
  const currentLines: string[] = [];

  const flush = (): void => {
    if (!currentHeading) return;
    const sanitized = currentLines.map(sanitizeAiLine).filter((l) => l.trim() !== '');
    sections.push({
      heading: sanitizeAiLine(currentHeading),
      lines: applyAiLineLimit(sanitized),
    });
    currentLines.length = 0;
  };

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)$/);
    if (headingMatch && headingMatch[1]) {
      flush();
      currentHeading = headingMatch[1];
    } else if (line.startsWith('---')) {
      flush();
      currentHeading = '';
    } else {
      currentLines.push(line);
    }
  }
  flush();
  if (!currentHeading && currentLines.length > 0) {
    const sanitized = currentLines.map(sanitizeAiLine).filter((l) => l.trim() !== '');
    sections.push({ heading: 'Результирующий вывод', lines: applyAiLineLimit(sanitized) });
  }
  return sections;
}
```

**Acceptance:**

- [ ] DOCX с AI: общее число непустых параграфов ≤ 400 (было 776).
- [ ] Каждая AI-секция: ≤ 35 строк (≈7 абзацев).
- [ ] Inv-test: `expect(countNonEmptyParagraphs(docxBuf)).toBeLessThan(450)`.

---

### 1.4. D-EMPTY-PAGE — Убрать серию из 10 пустых параграфов на титуле

**Файл:** `code/backend/src/report/docx/builder.ts` — `buildDocx`, ГОСТ-титульник (строка ≈126).

**Сейчас:**

```typescript
children.push(
  centered('ProductCamp', 32, true),
  centered('Трек «Конверсии и лидген»', 28),
  ...blanks(6),
  centered('Аналитический отчёт...', 36, true),
  ...blanks(1),
  centered(`за период ...`),
  ...blanks(10),          // ← вот эти 10 подряд флагнуты в аудите
  centered(`Идентификатор...`),
  ...
);
```

**Фикс — заменить «10 пустых параграфов» на 1 пустой + paragraph с управляемым spacing.before:**

```typescript
const spacer = (twipsBefore: number): Paragraph =>
  new Paragraph({ spacing: { before: twipsBefore, after: 0 }, children: [] });

children.push(
  centered('ProductCamp', 32, true),
  centered('Трек «Конверсии и лидген»', 28),
  spacer(1800), // ≈ 6 строк по высоте, но один параграф
  centered('Аналитический отчёт по конверсиям и лидгену', 36, true),
  spacer(360),
  centered(`за период ${snapshot.period.from} — ${snapshot.period.to}`, 28),
  spacer(3000), // ≈ 10 строк
  centered(`Идентификатор среза данных: ${snapshot.id}`, 24),
  centered(`Сформирован: ${snapshot.generatedAt}`, 24),
  centered(`Цель: ${snapshot.kpi.target} оплаченных билетов`, 24),
  spacer(720),
  centered(year, 24),
);
```

**Дополнительно — глобальный пост-процессор для тела:**

```typescript
// после сборки `children`, перед new Document(...)
function collapseConsecutiveEmpty(items: (Paragraph | Table)[]): (Paragraph | Table)[] {
  const out: (Paragraph | Table)[] = [];
  let emptyRun = 0;
  for (const it of items) {
    const isEmptyP =
      it instanceof Paragraph &&
      // эвристика: пустой параграф = нет children и нет spacing.before
      (it as unknown as { properties?: { children?: unknown[] } }).properties?.children?.length ===
        0;
    if (isEmptyP) {
      emptyRun++;
      if (emptyRun <= 1) out.push(it);
    } else {
      emptyRun = 0;
      out.push(it);
    }
  }
  return out;
}

const finalChildren = collapseConsecutiveEmpty(children);
```

**Acceptance:**

- [ ] DOCX: `maxConsecutiveEmpty ≤ 1` (было 10).
- [ ] Титульник визуально соответствует ГОСТ Р 7.32-2017 (организация наверху, название по центру,
      ID/дата внизу).
- [ ] Inv-test: `expect(analyzeDocx(buf).maxConsecutiveEmpty).toBeLessThanOrEqual(1)`.

---

## 🟢 Часть 2 — Исторические Minor

### 2.1. M-DET — Content-determinism spec + inv-test

**Где:** `CLAUDE.md` и `docs/anti-hallucination.md`.

**Обновить формулировку:**

```markdown
## Определение детерминизма отчётов

ProductCamp Analytics гарантирует **content-determinism**:

✅ Один `snapshotId` → идентичные `word/document.xml` (SHA-256) + идентичные PNG-файлы
(по SHA1-хэшу содержимого, имена файлов = хэши).

⚠️ Файловый SHA-256 целого DOCX/PDF может отличаться между генерациями — zip/pdf
метаданные содержат timestamps (известное ограничение `docx-js` и `puppeteer-core`).

Для побайтового SHA-256 (опционально):

- JSZip: передавать `date: new Date(0)` при `zip.file(path, content, { date })`.
- PDF: пост-процесс через `qpdf --linearize --object-streams=disable`.
```

**Inv-test** (`code/backend/tests/report/determinism.test.ts`):

```typescript
import JSZip from 'jszip';
import crypto from 'node:crypto';

async function sha256(buf: ArrayBuffer | string): Promise<string> {
  const h = crypto.createHash('sha256');
  h.update(typeof buf === 'string' ? buf : Buffer.from(buf));
  return h.digest('hex');
}

async function extractContent(docxBuf: Buffer) {
  const zip = await JSZip.loadAsync(docxBuf);
  const documentXml = await zip.file('word/document.xml')!.async('string');
  const pngs = await Promise.all(
    Object.keys(zip.files)
      .filter((k) => k.startsWith('word/media/') && k.endsWith('.png'))
      .sort()
      .map(async (k) => ({ name: k, sha1: await sha256(await zip.file(k)!.async('arraybuffer')) })),
  );
  return { documentXmlHash: await sha256(documentXml), pngs };
}

it('content-determinism: same snapshot → identical XML + PNGs', async () => {
  const snap = makeSnapshot();
  const [b1, b2] = await Promise.all([buildDocx(snap), buildDocx(snap)]);
  const c1 = await extractContent(b1);
  const c2 = await extractContent(b2);
  expect(c1.documentXmlHash).toBe(c2.documentXmlHash);
  expect(c1.pngs).toEqual(c2.pngs);
});
```

---

### 2.2. C-005 — Нормализация URL «Топ страниц входа»

**Файл:** место, где `page_stats` пишется (искать `INSERT INTO page_stats` или ETL pages).

```typescript
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname}`;
  } catch {
    return url.trim();
  }
}
```

**Применение:** при записи `page_stats.url = normalizeUrl(rawUrl)`; `raw_url` оставить в
отладочной колонке для трассировки.

**Миграция** (`scripts/dedupe-pages.ts`):

```typescript
import Database from 'better-sqlite3';
import { normalizeUrl } from '../code/backend/src/etl/pages';

const db = new Database('data/productcamp.db');
const rows = db.prepare('SELECT * FROM page_stats').all() as Array<{
  date: string;
  url: string;
  visits: number;
  bounce_rate: number;
  goal_reaches: number;
  segment: string;
}>;
const groups = new Map<string, typeof rows>();
for (const r of rows) {
  const key = `${r.date}|${normalizeUrl(r.url)}|${r.segment}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(r);
}
const trx = db.transaction(() => {
  db.exec('DELETE FROM page_stats');
  const ins = db.prepare(`
    INSERT INTO page_stats (date, url, visits, bounce_rate, goal_reaches, segment)
    VALUES (?,?,?,?,?,?)
  `);
  for (const [key, items] of groups) {
    const [date, url, segment] = key.split('|');
    const visits = items.reduce((s, r) => s + r.visits, 0);
    const bounce =
      visits > 0 ? items.reduce((s, r) => s + r.bounce_rate * r.visits, 0) / visits : 0;
    const reaches = items.reduce((s, r) => s + r.goal_reaches, 0);
    ins.run(date, url, visits, bounce, reaches, segment);
  }
});
trx();
```

**Acceptance:**

- [ ] `https://productcamp.ru/` в /overview «Топ страниц входа» — одна строка.
- [ ] Inv-test: `SELECT COUNT(*) FROM page_stats GROUP BY date, url, segment HAVING COUNT(*) > 1` = 0.

---

### 2.3. m-007 — GOAL_ID Combobox (verify only — уже в коде)

В `code/frontend/src/routes/settings.tsx` Combobox уже реализован (строки 17–105: `GoalCombobox`
с группами Активные/Архивные, поиском, displayValue).

**Acceptance — только верификация:**

- [ ] Открыть /settings в браузере. Подтвердить:
  - Поле GOAL_ID — combobox, не input number.
  - Search-input работает (печать «оплата» фильтрует).
  - Группы «Активные (N)» / «Архивные (N)» с counter.
  - Выбор сохраняется + триггерит re-sync.

---

### 2.4. m-snapshot-label — `formatGoalLabel` в KPI снапшота

**Файл:** `code/shared/src/report-sections.ts` (раздел «Краткие итоги», строка ≈377).

**Сейчас:**

```typescript
`${s.goalLabel?.title ?? 'Заявок B2C'} (достижения основной цели за период): ${s.kpi.b2cApplications}`,
```

`s.goalLabel?.title` корректно даёт «Оплат» при `isPaid=true`. Защита: убедиться, что
`SnapshotBuilder` сохраняет `goalLabel` через `formatGoalLabel(primaryGoal)`.

**Проверка:** `code/backend/src/report/snapshot-builder.ts` — найти, где формируется `goalLabel`,
и убедиться:

```typescript
import { formatGoalLabel } from '@pca/shared';

const goalLabel = formatGoalLabel(primaryGoal); // НЕ undefined fallback вручную
```

**Frontend KPI** — `code/frontend/src/routes/report-preview.tsx` (или где KPI блок):

```tsx
import { formatGoalLabel } from '@pca/shared';

const label = snapshot.goalLabel ?? formatGoalLabel(undefined);
<KpiCard label={label.title.toUpperCase()} value={snapshot.kpi.b2cApplications} />;
{
  label.showApplicationsCaveat && <span className="text-xs">заявка ≠ оплата</span>;
}
```

**Acceptance:**

- [ ] При `goalLabel.isPaid=true` (e_purchase): KPI лейбл = «ОПЛАТ» в /overview, /goals, /report.
- [ ] При обычной цели: «ЗАЯВКИ B2C» (опционально с caveat).
- [ ] Тест: `expect(reportPreview).toContain('ОПЛАТ')` при purchase-цели.

---

### 2.5. m-api-key — Маска Anthropic API Key в UI

**Файл:** `code/frontend/src/routes/settings.tsx` (поле `ANTHROPIC_API_KEY`, строка ≈422).

**Сейчас:** при наличии сохранённого ключа `q.data.ANTHROPIC_API_KEY` = `"sk-a****AA"`,
но `settings.ANTHROPIC_API_KEY` обнуляется в `'' `, поле пустое, маска нигде не видна.

**Фикс:**

```tsx
// Получаем маску напрямую из API-ответа:
const apiKeyMask = q.data?.ANTHROPIC_API_KEY?.includes('****') ? q.data.ANTHROPIC_API_KEY : '';

<div>
  <input
    type="password"
    value={form.ANTHROPIC_API_KEY}
    onChange={(e) => set('ANTHROPIC_API_KEY', e.target.value)}
    placeholder={apiKeyMask || 'sk-ant-...'}
    className="block w-full rounded border border-slate-300 px-3 py-2 text-sm"
  />
  {apiKeyMask && !form.ANTHROPIC_API_KEY && (
    <p className="mt-1 text-xs text-slate-500">
      Текущий ключ: <code className="font-mono">{apiKeyMask}</code>. Оставьте пустым, чтобы не
      менять.
    </p>
  )}
</div>;
```

**Acceptance:**

- [ ] Если ключ настроен — под полем виден `sk-a****AA`.
- [ ] Поле password (звёздочки при наборе нового).
- [ ] Сохранение пустого значения НЕ затирает ключ (логика уже в onSave).

---

## 🔵 Часть 3 — Ручные верификации

### 3.1. offline-docx — ГОСТ-аудит в Word/LibreOffice

1. Сгенерировать DOCX и PDF свежего снапшота с AI.
2. Открыть DOCX в **MS Word** (или LibreOffice Writer).
3. Скриншоты в `qa/offline-audit-v2.9.1.md`:
   - [ ] Поля 30/15/20/20 мм.
   - [ ] Times New Roman 14pt.
   - [ ] Line-spacing 1.5.
   - [ ] Нумерация страниц внизу по центру.
   - [ ] Титул: ProductCamp / трек / название / период / snapshotId / дата / цель / год.
   - [ ] TOC с гиперссылками (клик → переход на раздел).
   - [ ] 3 PNG-графика видны, не обрезаны.
   - [ ] **AI-заголовки без эмодзи в начале** (D-EMOJI).
   - [ ] **Нет «11. 1. …»** (D-DOUBLE-NUM).
   - [ ] **Нет 2+ пустых параграфов подряд** (D-EMPTY-PAGE).
   - [ ] AI ≤ 35 строк на секцию (D-VERBOSE).
   - [ ] Текст выровнен по ширине (justified).
4. То же для PDF (Preview / Adobe Reader).

### 3.2. mobile-pass — Playwright iPhone 14

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

for (const p of pages) {
  test(`mobile no horizontal scroll: ${p}`, async ({ page }) => {
    await page.goto('http://localhost:5173' + p);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth > d.clientWidth;
    });
    expect(overflow).toBe(false);
  });
}
```

### 3.3. a11y-audit — axe-core 0 violations

`e2e/a11y.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, getViolations } from 'axe-playwright';

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

for (const p of pages) {
  test(`a11y WCAG 2 A/AA: ${p}`, async ({ page }) => {
    await page.goto('http://localhost:5173' + p);
    await injectAxe(page);
    const violations = await getViolations(page, undefined, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(violations).toHaveLength(0);
  });
}
```

### 3.4. ai-live-validation — POST /api/report/insights end-to-end

1. Сформировать снапшот через UI.
2. Нажать «Сгенерировать AI-анализ» в /report.
3. Подождать 60-90 секунд.
4. Проверить:
   - [ ] 6 секций в превью: Итог / Каналы UTM Аудитория / Страницы Воронка /
         Риски Рекомендации / Гипотезы Дорожная карта / Итоговый вывод.
   - [ ] `GET /api/report/snapshots/:id` → `aiNarrative` присутствует.
   - [ ] Экспорт DOCX содержит AI без D-EMOJI / D-DOUBLE-NUM / D-VERBOSE дефектов.

---

## 📋 Контрольный inv-тест (единственный merge-гейт)

`code/backend/tests/report/v2_9_1_acceptance.test.ts`:

```typescript
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';
import { buildDocx } from '../../src/report/docx/builder';
import { makeSnapshotWithAi } from './fixtures';

it('v2.9.1 acceptance: full AI-DOCX audit', async () => {
  const buf = await buildDocx(makeSnapshotWithAi());
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')!.async('string');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const paragraphs = Array.from(doc.getElementsByTagName('w:p'));
  let nonEmpty = 0,
    maxEmpty = 0,
    currentEmpty = 0;
  let emojiHeadings = 0,
    doubleNum = 0;
  let justified = 0;

  for (const p of paragraphs) {
    const text = Array.from(p.getElementsByTagName('w:t'))
      .map((t) => t.textContent ?? '')
      .join('');
    const style = p.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val') ?? '';
    const align = p.getElementsByTagName('w:jc')[0]?.getAttribute('w:val') ?? '';

    if (text.trim() === '') {
      currentEmpty++;
      maxEmpty = Math.max(maxEmpty, currentEmpty);
    } else {
      nonEmpty++;
      currentEmpty = 0;
      if (align === 'both') justified++;
      if (/^Heading/.test(style)) {
        if (/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/u.test(text)) emojiHeadings++;
        if (/^\d+\.\s+\d+\./.test(text)) doubleNum++;
      }
    }
  }

  expect(nonEmpty).toBeLessThanOrEqual(450); // D-VERBOSE
  expect(maxEmpty).toBeLessThanOrEqual(1); // D-EMPTY-PAGE
  expect(emojiHeadings).toBe(0); // D-EMOJI
  expect(doubleNum).toBe(0); // D-DOUBLE-NUM
  expect(justified / nonEmpty).toBeGreaterThanOrEqual(0.85); // ГОСТ
  expect(xml).not.toMatch(/####|<p>|<br/); // MD leaks
});
```

---

## 🚀 Финальный чек-лист

### AI-DOCX чистота

- [ ] D-EMOJI: 0 эмодзи-заголовков (было 22).
- [ ] D-DOUBLE-NUM: 0 двойных нумераций (было «11. 1. …»).
- [ ] D-VERBOSE: ≤ 450 параграфов (было 776).
- [ ] D-EMPTY-PAGE: ≤ 1 подряд пустых (было 10).

### Исторические Minor

- [ ] M-DET: спека + inv-test.
- [ ] C-005: normalizeUrl + миграция.
- [ ] m-007: верификация UX.
- [ ] m-snapshot-label: formatGoalLabel везде.
- [ ] m-api-key: маска видна.

### Ручные

- [ ] offline-docx: скриншоты в `qa/offline-audit-v2.9.1.md`.
- [ ] mobile-pass: 9 страниц зелёные.
- [ ] a11y-audit: 0 violations.
- [ ] ai-live-validation: 6 секций сохранены.

### Релиз

- [ ] `pnpm typecheck && lint && format:check && coverage && build && e2e` зелёное.
- [ ] CHANGELOG v2.9.1.
- [ ] `git tag v2.9.1`.
- [ ] Пилот: Лиза + 2 волонтёра, 1 неделя.

---

> «v2.9.0 — production без AI. v2.9.1 — production с AI без оговорок.»
