# 🎯 Fix-Prompt v2.9.1 COMPREHENSIVE — Финальный консолидированный план

> Дата: 2026-05-29. Базис: v2.9.0 PRODUCTION-READY (без AI). Цель — полировка AI-нарратива
>
> - закрытие исторических Minor + ручные верификации, не покрытые автотестами.
>   Срок: **3–4 дня**. Блокеров нет — это polish для v3.0.0-readiness.

---

## 📋 Сводная таблица всех открытых дефектов

| ID                     | Sev      | Источник             | Описание                                                      | День |
| ---------------------- | -------- | -------------------- | ------------------------------------------------------------- | ---- |
| **D-EMOJI**            | 🟡 Major | offline-audit-v2.9.0 | 22 AI-заголовка начинаются с эмодзи (🔴/✅/🟡/⚠️)             | 1    |
| **D-DOUBLE-NUM**       | 🟡 Major | offline-audit-v2.9.0 | TOC: «11. 1. Где мы сейчас» — двойная нумерация AI-секций     | 1    |
| **D-VERBOSE**          | 🟢 Minor | offline-audit-v2.9.0 | 776 параграфов с AI vs 200 без — AI генерит длинные нарративы | 1    |
| **D-EMPTY-PAGE**       | 🟢 Minor | offline-audit-v2.9.0 | 10 подряд пустых параграфов = пустая страница в DOCX          | 2    |
| **M-DET**              | 🟢 Minor | v2.8.6 carried       | SHA-256 файлов разный (zip/pdf timestamps), контент детерм.   | 2    |
| **C-005**              | 🟢 Minor | v2.8.6 carried       | Дубли URL `https://productcamp.ru/` в Топ страниц входа       | 2    |
| **m-007**              | 🟢 Minor | v2.8.6 carried       | GOAL_ID — input number, не combobox с поиском                 | 2    |
| **m-snapshot-label**   | 🟢 Minor | v2.8.3 carried       | В KPI снапшота лейбл «Заявки B2C» при e_purchase              | 2    |
| **m-api-key**          | 🟢 Minor | v2.8.3 carried       | Anthropic API Key показан пустым placeholder вместо маски     | 2    |
| **offline-docx**       | —        | v2.8.6 carried       | Ручной ГОСТ-аудит DOCX/PDF в Word (со скриншотами)            | 3    |
| **mobile-pass**        | —        | v2.8.6 carried       | Playwright iPhone 14 e2e на 9 страницах                       | 3    |
| **ai-live-validation** | —        | v2.8.6 carried       | POST /api/report/insights → 6 секций → snapshot.aiInsights    | 3    |
| **sync-progress-live** | —        | v2.8.6 carried       | UI прогресс-бар «Обновить данные из Метрики», 10 стадий       | 3    |

**Итого:** 2 Major + 7 Minor + 4 ручные верификации.

---

## 🔴 День 1 — Чистка AI-нарратива в DOCX (главное)

### 1.1. D-EMOJI — Удаление эмодзи в начале заголовков

**Где:** `code/backend/src/report/ai/sanitize.ts`

**Сейчас:** sanitize-html `textFilter` применяется к содержимому `<text>` нод глобально, но
NOT к содержимому `<h2>`/`<h3>` отдельно. AI возвращает `<h3>🔴 Ключевые риски</h3>` —
эмодзи остаётся.

**Фикс:**

```typescript
import sanitizeHtml from 'sanitize-html';

const LEADING_EMOJI_RE =
  /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}🟢🔴🟡🟠⚠️✅❌💡⭐📊📈📉🚀🎯🔥]+\s*/u;

export function stripLeadingEmoji(text: string): string {
  return text.replace(LEADING_EMOJI_RE, '').trim();
}

export function sanitizeAiHtml(raw: string): ParsedBlock[] {
  let html = raw;

  // 1. Сконвертировать MD если есть
  if (/^#{1,4}\s/m.test(html) || /^\*\*\*?/m.test(html)) {
    const { marked } = require('marked');
    html = marked.parse(html);
  }

  // 2. Sanitize + transformTags для заголовков
  const clean = sanitizeHtml(html, {
    allowedTags: [
      'h2',
      'h3',
      'h4',
      'p',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'strong',
      'em',
      'br',
    ],
    allowedAttributes: {},
    transformTags: {
      h2: (tagName, attribs) => ({ tagName, attribs, text: '' }),
      h3: (tagName, attribs) => ({ tagName, attribs, text: '' }),
      h4: (tagName, attribs) => ({ tagName, attribs, text: '' }),
    },
    textFilter: (text, tagName) => {
      if (['h2', 'h3', 'h4'].includes(tagName)) {
        return stripLeadingEmoji(text);
      }
      return text;
    },
  });

  return parseHtmlToParagraphs(clean);
}
```

**Inv-test:**

```typescript
// code/backend/tests/report/sanitize.test.ts
import { sanitizeAiHtml } from '../../src/report/ai/sanitize';

it('strips leading emoji from headings', () => {
  const html = '<h3>🔴 Ключевые риски</h3><p>Текст с 🔴 акцентом — ок.</p>';
  const blocks = sanitizeAiHtml(html);
  expect(blocks[0].type).toBe('heading');
  expect(blocks[0].text).toBe('Ключевые риски'); // эмодзи убран
  expect(blocks[1].type).toBe('paragraph');
  expect(blocks[1].text).toContain('🔴'); // в параграфе остался
});

it('strips multiple emoji + variation selectors', () => {
  expect(stripLeadingEmoji('⚠️ Внимание')).toBe('Внимание');
  expect(stripLeadingEmoji('✅ Рекомендации')).toBe('Рекомендации');
  expect(stripLeadingEmoji('🟢🔴 Свет')).toBe('Свет');
});
```

**Acceptance:**

- [ ] Inv-тест в `qa-offline-docx-ai-v2.9.1.md`: `headingsStartingWithEmoji = 0`.
- [ ] Регулярка `/^[🟢🔴🟡✅⚠️❌]/` по тексту всех `w:pStyle="Heading"` параграфов → 0 матчей.
- [ ] Эмодзи в середине абзацев остаются (это допустимо).

---

### 1.2. D-DOUBLE-NUM — Устранить двойную нумерацию AI-секций

**Где:** AI prompt + `code/backend/src/report/docx/builder.ts`

**Сейчас:** AI возвращает `<h3>1. Где мы сейчас</h3>` (хотя prompt запрещает), внешний
builder добавляет `11. ` → итого `11. 1. Где мы сейчас`.

**Фикс — двухсторонняя защита:**

#### A. Усилить AI prompt

`code/backend/src/report/ai/prompts/insights.md`:

```markdown
# Анализ снимка данных ProductCamp

Ты — аналитик. Получаешь JSON-снимок данных Яндекс.Метрики и B2B-пайплайна.
Сгенерируй 5 секций отчёта в формате HTML.

## КРИТИЧНО — нумерация

❌ НИКОГДА не нумеруй свои подзаголовки:

- НЕ пиши `<h3>1. Где мы сейчас</h3>`
- НЕ пиши `<h3>Шаг 1. Анализ</h3>`
- НЕ пиши `<h2>Раздел 3.</h2>`

✅ Пиши заголовки как смысловую тему:

- `<h3>Где мы сейчас</h3>`
- `<h3>Анализ конверсии</h3>`
- `<h3>Ключевые риски</h3>`

Нумерация добавляется во внешнем шаблоне ОТЧЁТА.

## КРИТИЧНО — эмодзи

❌ НЕ начинай заголовки с эмодзи:

- НЕ пиши `<h3>🔴 Риски</h3>`

✅ Эмодзи разрешены ТОЛЬКО в теле абзацев как акцент:

- `<p>Канал «Direct» 🔴 проседает на 30%.</p>`

## КРИТИЧНО — объём

❌ НЕ пиши длинные нарративы. Лимит на секцию:

- ≤ 5 параграфов
- Каждый параграф ≤ 4-5 предложений
- Один список ≤ 7 пунктов

## Разрешённые теги

`<h3>`, `<p>`, `<ul>`, `<ol>`, `<li>`, `<table>`, `<tr>`, `<td>`, `<strong>`, `<em>`.
Markdown запрещён (никаких `##`, `**`, `1.`).

## Структура ответа (JSON)

\`\`\`json
{
"summary": "<h3>Главное</h3><p>...</p>",
"channels": "<h3>Каналы и UTM</h3><p>...</p>",
"behavior": "<h3>Страницы и воронка</h3><p>...</p>",
"risks": "<h3>Ключевые риски</h3><p>...</p>",
"hypotheses": "<h3>Гипотезы роста</h3><p>...</p>",
"conclusion": "<h3>Итоговый вывод</h3><p>...</p>"
}
\`\`\`

Опирайся ТОЛЬКО на числа из snapshot. Не выдумывай.
```

#### B. Post-parse защита в builder

`code/backend/src/report/ai/sanitize.ts`:

```typescript
const LEADING_NUM_RE = /^(?:\d+\.|\d+\)|Шаг\s+\d+\.|Раздел\s+\d+\.)\s*/i;

export function stripLeadingNumbering(text: string): string {
  return text.replace(LEADING_NUM_RE, '').trim();
}

// В transformTags для h2/h3/h4:
textFilter: (text, tagName) => {
  if (['h2', 'h3', 'h4'].includes(tagName)) {
    return stripLeadingNumbering(stripLeadingEmoji(text));
  }
  return text;
};
```

**Inv-test:**

```typescript
it('strips AI numbering prefix from headings', () => {
  expect(stripLeadingNumbering('1. Где мы сейчас')).toBe('Где мы сейчас');
  expect(stripLeadingNumbering('Шаг 2. Анализ')).toBe('Анализ');
  expect(stripLeadingNumbering('3) Каналы')).toBe('Каналы');
});

it('preserves non-prefix numbering inside paragraphs', () => {
  const html = '<p>Канал Direct дал 1. 363 визита 2. 2 заявки.</p>';
  const blocks = sanitizeAiHtml(html);
  expect(blocks[0].text).toContain('1. 363'); // в тексте оставляем
});
```

**Acceptance:**

- [ ] TOC сгенерированного DOCX: нет двойной нумерации (regex `/^\d+\.\s+\d+\./` → 0 матчей).
- [ ] AI-секции имеют осмысленные заголовки без префикса «1.», «Шаг 1.», «Раздел 1.».

---

### 1.3. D-VERBOSE — Сократить AI-нарратив

**Где:** AI prompt (см. §1.2.A) + builder с soft-limit.

**Дополнительная защита в builder:**

```typescript
const AI_MAX_PARAGRAPHS_PER_SECTION = 7;
const AI_MAX_TOTAL_PARAGRAPHS = 250;

function renderAi(
  blocks: ParsedBlock[],
  sectionLimit = AI_MAX_PARAGRAPHS_PER_SECTION,
): Paragraph[] {
  const out: Paragraph[] = [];
  let count = 0;
  for (const b of blocks) {
    if (count >= sectionLimit) {
      out.push(justifiedParagraph('…[раздел сокращён по лимиту объёма]…'));
      break;
    }
    out.push(...blockToParagraphs(b));
    if (b.type === 'paragraph') count++;
  }
  return out;
}
```

**Acceptance:**

- [ ] DOCX с AI: общее количество непустых параграфов ≤ 350 (было 776).
- [ ] Каждая AI-секция (по `<h3>` границам): ≤ 7 содержательных параграфов.
- [ ] Inv-test: `expect(countParagraphs(docxBuf)).toBeLessThan(400)`.

---

## 🟢 День 2 — Закрыть исторические Minor + пустые страницы

### 2.1. D-EMPTY-PAGE — Убрать серии пустых параграфов

**Где:** `code/backend/src/report/docx/builder.ts` (финальный пост-процессинг).

**Фикс — schema-валидатор перед `Packer.toBuffer`:**

```typescript
function collapseConsecutiveEmpty(paragraphs: Paragraph[]): Paragraph[] {
  const out: Paragraph[] = [];
  let emptyRun = 0;
  for (const p of paragraphs) {
    const text = extractText(p).trim();
    if (text === '') {
      emptyRun++;
      if (emptyRun <= 1) out.push(p); // максимум 1 пустая подряд
    } else {
      emptyRun = 0;
      out.push(p);
    }
  }
  return out;
}

// В builder перед сборкой документа:
const finalParagraphs = collapseConsecutiveEmpty(sections.flatMap((s) => s.paragraphs));
```

**Inv-test:**

```typescript
it('no more than 1 consecutive empty paragraph', async () => {
  const buf = await generateDocx(testSnapshot);
  const { maxConsecutiveEmpty } = await analyzeDocx(buf);
  expect(maxConsecutiveEmpty).toBeLessThanOrEqual(1);
});
```

**Acceptance:**

- [ ] DOCX: `maxConsecutiveEmpty ≤ 1` (было 10).
- [ ] Нет пустых страниц перед/после содержания.
- [ ] PDF: визуальная проверка — между блоками не более одного пустого абзаца.

---

### 2.2. M-DET — Спека content-determinism + опц. побайтовый

**Где:** `CLAUDE.md`, `docs/anti-hallucination.md`, inv-test.

#### A. Обновить спеку (обязательно)

```markdown
## Определение детерминизма отчётов

ProductCamp Conversion Analytics Tool гарантирует **content-determinism**:

✅ Один `snapshotId` → идентичные `word/document.xml` и идентичные PNG-файлы
(по SHA1-хэшу содержимого).

⚠️ SHA-256 целого DOCX/PDF файла может отличаться между генерациями из-за
zip-метаданных (timestamps) — это known limitation библиотек `docx-js` и
`puppeteer-core`.

Для побайтового SHA-256 (опционально): см. §3.2.B.
```

#### B. Inv-test для content-determinism

```typescript
// code/backend/tests/report/determinism.test.ts
import JSZip from 'jszip';
import crypto from 'node:crypto';

async function sha256(buf: ArrayBuffer | string): Promise<string> {
  const h = crypto.createHash('sha256');
  h.update(typeof buf === 'string' ? buf : Buffer.from(buf));
  return h.digest('hex');
}

async function extractContent(docxBuf: ArrayBuffer) {
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

it('content-determinism: same snapshotId → same XML + PNGs', async () => {
  const id = await generateSnapshot(testData);
  const [doc1, doc2] = await Promise.all([downloadDocx(id), downloadDocx(id)]);
  const c1 = await extractContent(doc1);
  const c2 = await extractContent(doc2);
  expect(c1.documentXmlHash).toBe(c2.documentXmlHash);
  expect(c1.pngs).toEqual(c2.pngs);
});
```

#### C. Опционально — побайтовый SHA-256

```typescript
// docx-js
const zip = new JSZip();
// При добавлении файлов:
zip.file('word/document.xml', xml, { date: new Date(0) });

// puppeteer-core PDF
const pdf = await page.pdf({
  format: 'A4',
  displayHeaderFooter: true,
  // pdf metadata уберём через qpdf post-process:
});
await execFile('qpdf', [
  '--linearize',
  '--object-streams=disable',
  '--newline-before-endstream',
  inputPath,
  outputPath,
]);
```

**Acceptance:**

- [ ] `CLAUDE.md` обновлён: формулировка «content-determinism».
- [ ] Inv-тест зелёный: `documentXmlHash` и `pngs` совпадают между 2 генерациями.
- [ ] (Опц.) Побайтовый SHA-256 совпадает после JSZip date(0) + qpdf.

---

### 2.3. C-005 — Нормализация URL «Топ страниц входа»

**Где:** `code/backend/src/etl/pages.ts` + миграция.

```typescript
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname}`;
  } catch {
    return url.trim();
  }
}

// При записи в page_stats:
const storeUrl = normalizeUrl(rawUrl);
// rawUrl сохраняем отдельно для отладки в колонке page_stats.raw_url
```

**Миграция данных:**

```typescript
// scripts/dedupe-pages.ts
import { db } from '../code/backend/src/db';
import { normalizeUrl } from '../code/backend/src/etl/pages';

const rows = db.prepare('SELECT * FROM page_stats').all();
const groups = new Map<string, any[]>();
for (const r of rows) {
  const key = `${r.date}|${normalizeUrl(r.url)}|${r.segment}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key)!.push(r);
}

const trx = db.transaction(() => {
  db.exec('DELETE FROM page_stats');
  const insert = db.prepare(`
    INSERT INTO page_stats (date, url, visits, bounce_rate, goal_reaches, segment)
    VALUES (?,?,?,?,?,?)
  `);
  for (const [key, items] of groups) {
    const [date, url, segment] = key.split('|');
    const visits = items.reduce((s, r) => s + r.visits, 0);
    const bounce = items.reduce((s, r) => s + r.bounce_rate * r.visits, 0) / visits;
    const reaches = items.reduce((s, r) => s + r.goal_reaches, 0);
    insert.run(date, url, visits, bounce, reaches, segment);
  }
});
trx();
```

**Acceptance:**

- [ ] `https://productcamp.ru/` в /overview «Топ страниц входа» появляется ОДИН раз.
- [ ] `https://productcamp.ru/summer2026` — отдельной записью.
- [ ] Inv-тест: `SELECT COUNT(*) FROM page_stats GROUP BY date, url, segment HAVING COUNT(*) > 1` = 0.

---

### 2.4. m-007 — GOAL_ID Combobox с поиском и группами

**Где:** `code/frontend/src/routes/settings.tsx`

```tsx
import { Combobox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

function GoalCombobox({ value, onChange }: { value: number; onChange: (id: number) => void }) {
  const { data: goals = [] } = useQuery({ queryKey: ['metrika-goals'], queryFn: fetchGoals });
  const [query, setQuery] = useState('');
  const active = goals.filter((g) => !g.isArchived);
  const archived = goals.filter((g) => g.isArchived);
  const filter = (list: Goal[]) =>
    query === '' ? list : list.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Input
          className="w-full rounded-md border px-3 py-2 focus-visible:ring-2 ring-blue-500"
          displayValue={(id: number) =>
            goals.find((g) => g.id === id)?.name ?? '0 — Авто-определение'
          }
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти цель по названию..."
        />
        <Combobox.Button className="absolute inset-y-0 right-0 px-2">
          <ChevronUpDownIcon className="h-5 w-5" />
        </Combobox.Button>
        <Combobox.Options className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md bg-white shadow-lg">
          <Combobox.Option value={0} className="px-3 py-2 hover:bg-blue-50">
            0 — Авто-определение
          </Combobox.Option>
          <div className="px-3 py-1 text-xs font-bold uppercase text-slate-500 bg-slate-50">
            Активные ({active.length})
          </div>
          {filter(active).map((g) => (
            <Combobox.Option key={g.id} value={g.id} className="px-3 py-2 hover:bg-blue-50">
              {g.name}
              <span className="ml-2 text-xs text-slate-500">[{g.type}]</span>
            </Combobox.Option>
          ))}
          <div className="px-3 py-1 text-xs font-bold uppercase text-slate-500 bg-slate-50">
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
- [ ] Тип цели как badge `[number]`/`[step]`/`[e_purchase]`.
- [ ] При выборе сохраняется в /api/settings и применяется к sync.

---

### 2.5. m-snapshot-label — formatGoalLabel в KPI снапшота

**Где:** `code/backend/src/report/snapshot.ts` + frontend KPI-блок.

**Сейчас:** `/report` превью KPI блок «ЗАЯВКИ B2C 50 · заявка ≠ оплата» при e_purchase.

**Должно быть:** применять `formatGoalLabel(goalLabel)` так же, как на /overview и /goals.

```typescript
// shared/formatGoalLabel.ts (общая функция уже есть в @pca/shared)
export function formatGoalLabel(g: GoalLabel): string {
  if (g.isPaid) return 'Оплат';
  if (g.showApplicationsCaveat) return 'Заявки B2C · заявка ≠ оплата';
  return 'Заявки';
}

// frontend ReportPreview KPI block:
<KpiCard label={formatGoalLabel(snapshot.goalLabel)} value={snapshot.kpi.b2cApplications} />
```

**Acceptance:**

- [ ] При e_purchase: KPI лейбл = «ОПЛАТ» во всех 3 местах (/overview, /goals, /report).
- [ ] При обычной цели (step): «ЗАЯВКИ B2C» (без caveat).
- [ ] При обычной цели + showApplicationsCaveat: «ЗАЯВКИ B2C · заявка ≠ оплата».

---

### 2.6. m-api-key — Показать маску Anthropic API Key в UI

**Где:** `code/frontend/src/routes/settings.tsx`

**Сейчас:** `/api/settings` отдаёт `"ANTHROPIC_API_KEY":"sk-a****AA"`, UI показывает пустой placeholder.

**Фикс:**

```tsx
const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
const apiKeyMask = settings?.ANTHROPIC_API_KEY ?? '';

<input
  type="password"
  value={apiKeyValue}
  onChange={(e) => setApiKeyValue(e.target.value)}
  placeholder={apiKeyMask || 'sk-ant-…'}
  className="w-full rounded-md border px-3 py-2"
/>;
{
  apiKeyMask && !apiKeyValue && (
    <p className="text-xs text-slate-500 mt-1">
      Текущий ключ: <code>{apiKeyMask}</code>. Оставьте пустым, чтобы не менять.
    </p>
  );
}
```

**Acceptance:**

- [ ] Если ключ настроен — показывается маска вида `sk-a****AA` под полем.
- [ ] Поле ввода пустое, тип `password` (звёздочки при наборе).
- [ ] Сохранение пустого значения — НЕ затирает текущий ключ.

---

## 🔵 День 3 — Ручные верификации (требуют живого окружения)

### 3.1. offline-docx — ГОСТ-аудит DOCX/PDF в Word

**Шаги:**

1. Сгенерировать DOCX и PDF свежего снапшота (с AI-нарративом).
2. Открыть DOCX в **MS Word** или **LibreOffice Writer**.
3. Скриншоты в `qa/offline-audit-v2.9.1.md`:
   - [ ] Поля 30/15/20/20 мм (Layout → Margins).
   - [ ] Шрифт Times New Roman 14pt.
   - [ ] Line-spacing 1.5.
   - [ ] Красная строка 1.27 см.
   - [ ] Нумерация страниц внизу по центру.
   - [ ] Титульная страница: ProductCamp / трек / название / период / snapshotId / дата / цель / год.
   - [ ] TOC с гиперссылками — клик ведёт на раздел.
   - [ ] Подписи рисунков «Рисунок N — Название».
   - [ ] Подписи таблиц «Таблица N — Название».
   - [ ] 3 PNG-графика видны и не обрезаны.
   - [ ] Блок «🟢 Что хорошо / 🔴 Что плохо» после графиков (с цветным shading).
   - [ ] Раздел «Гипотезы роста» (≥3 в формате Воронковой).
   - [ ] Раздел «Decision Log» (≥3 решения).
   - [ ] AI-нарратив без сырых MD-тегов (####, \*\*).
   - [ ] **AI-заголовки без эмодзи в начале** (D-EMOJI fix).
   - [ ] **Единая нумерация без дублей «11. 1. ...»** (D-DOUBLE-NUM fix).
   - [ ] **Нет 2+ пустых параграфов подряд** (D-EMPTY-PAGE fix).
   - [ ] Текст выровнен по ширине (justified).
4. То же для PDF (Adobe Reader / Preview).

### 3.2. mobile-pass — Playwright iPhone 14 e2e

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
  test(`mobile: ${path} — no horizontal scroll`, async ({ page }) => {
    await page.goto('http://localhost:5173' + path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => {
      const d = document.documentElement;
      return d.scrollWidth > d.clientWidth;
    });
    expect(overflow).toBe(false);
  });

  test(`mobile: ${path} — hamburger menu visible`, async ({ page }) => {
    await page.goto('http://localhost:5173' + path);
    const hamburger = page.locator('[aria-label="Открыть меню"]');
    await expect(hamburger).toBeVisible();
  });
}
```

**Acceptance:**

- [ ] 9 страниц × 2 проверки = 18 тестов зелёные.
- [ ] Гамбургер видим, разворачивается, ссылки работают.

### 3.3. a11y-audit — axe-core headless

`e2e/a11y.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

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
  test(`a11y: ${path} — WCAG 2 A/AA`, async ({ page }) => {
    await page.goto('http://localhost:5173' + path);
    await injectAxe(page);
    const violations = await getViolations(page, undefined, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(violations).toHaveLength(0);
  });
}
```

**Acceptance:**

- [ ] 9 страниц × axe-core → 0 violations.
- [ ] Лог `passes` ≥ 25 на каждой странице.

### 3.4. ai-live-validation — POST /api/report/insights полный цикл

**Шаги:**

1. Сформировать снапшот через UI (`POST /api/report/snapshot`).
2. Нажать «Сгенерировать AI-анализ» в /report.
3. Подождать 60-90 секунд (Anthropic API + 6 секций).
4. Открыть превью отчёта.
5. Проверить:
   - [ ] 6 секций отображены в превью: Итог / Каналы UTM Аудитория / Страницы Воронка / Риски Рекомендации / Гипотезы Дорожная карта / Итоговый вывод.
   - [ ] Каждая — HTML без сырых MD-тегов (`####`, `**`, `1.`).
   - [ ] Сохранено в `GET /api/report/snapshots/:id` → `aiInsights` присутствует.
   - [ ] При повторной загрузке страницы — insights остались.
   - [ ] Экспорт DOCX содержит AI-секции БЕЗ дефектов D-EMOJI / D-DOUBLE-NUM / D-VERBOSE.

### 3.5. sync-progress-live — UI прогресс-бар «Обновить данные»

**Шаги:**

1. Открыть /settings.
2. Нажать «Обновить данные из Метрики».
3. Сделать скриншот каждой стадии (10 заявлено в release notes).
4. Проверить:
   - [ ] Прогресс-бар отображает % и описание текущей стадии.
   - [ ] Стадии: visits → applications → channels → utm → pages → geo → device → b2b → snapshot → done.
   - [ ] По завершении кнопка снова активна.
   - [ ] Toast/notification «Синхронизация завершена».
   - [ ] Дашборд показывает новые данные после refetch (visits/applications обновились).

---

## 🎯 День 4 (опционально) — Финальный регресс + релиз

### 4.1. Полный QA-прогон

- [ ] `pnpm typecheck && lint && format:check && coverage && build && e2e` — зелёное.
- [ ] Coverage порог 100% удержан.
- [ ] `qa/qa-report-v2.9.1.md` — финальный отчёт по всем 13 дефектам.

### 4.2. Документация

- [ ] `CHANGELOG.md` v2.9.1 с разделами Fixed/Changed/Tested.
- [ ] `docs/user-guide.md` — обновить про AI-анализ (что секций 6, что нет двойной нумерации).
- [ ] `docs/anti-hallucination.md` — формулировка content-determinism.
- [ ] `CLAUDE.md` — версия 2.9.1, упоминание sanitize-html.

### 4.3. SemVer и релиз

- [ ] `pnpm sync-versions` (package.json во всех пакетах = 2.9.1).
- [ ] `git tag v2.9.1 && git push --tags`.
- [ ] GitHub Release с CHANGELOG.

### 4.4. Пилот с командой

- [ ] Лиза + 2 волонтёра — недельный сбор feedback.
- [ ] Отдельный канал в Slack/Telegram для обратной связи.
- [ ] DL-001 запись в `data/decisions/DL-001-pilot-v2.9.1.md` через 7 дней.

---

## 📋 Финальный чек-лист приёмки v2.9.1

### AI DOCX чистота (главное)

- [ ] D-EMOJI: 0 заголовков с эмодзи в начале (было 22).
- [ ] D-DOUBLE-NUM: 0 двойных нумераций в TOC (было «11. 1. …»).
- [ ] D-VERBOSE: общее число параграфов ≤ 350 (было 776).
- [ ] D-EMPTY-PAGE: maxConsecutiveEmpty ≤ 1 (было 10).

### Исторические Minor

- [ ] M-DET: спека обновлена + content-determinism inv-тест зелёный.
- [ ] C-005: дубли URL устранены, миграция данных применена.
- [ ] m-007: combobox с группами Активные/Архивные.
- [ ] m-snapshot-label: formatGoalLabel применён в KPI снапшота.
- [ ] m-api-key: маска ключа отображается в /settings.

### Ручные верификации

- [ ] offline-docx: `qa/offline-audit-v2.9.1.md` со скриншотами.
- [ ] mobile-pass: Playwright 18 тестов зелёные.
- [ ] a11y-audit: 9 страниц × 0 violations.
- [ ] ai-live-validation: 6 секций сохранены в snapshot.aiInsights.
- [ ] sync-progress-live: 10 стадий, скриншоты в qa/.

### ГОСТ Р 7.32-2017 (для DOCX с AI и без)

- [ ] Times New Roman 14pt.
- [ ] Межстрочный 1.5.
- [ ] Поля 30/15/20/20 мм.
- [ ] Текст выровнен по ширине (justified) ≥ 90% параграфов.
- [ ] Красная строка 1.27 см.
- [ ] Нумерация страниц внизу по центру.

### Размеры и контент

- [ ] DOCX без AI: ≤ 200 КБ, ≤ 250 параграфов.
- [ ] DOCX с AI: ≤ 250 КБ, ≤ 400 параграфов.
- [ ] PDF без duplicate-разделов: ≤ 1.5 МБ.
- [ ] 3 PNG-графика встроены с SHA1-именами.

### Релиз

- [ ] CHANGELOG v2.9.1.
- [ ] git tag v2.9.1.
- [ ] GitHub Release notes.
- [ ] Пилот запущен (Лиза + 2 волонтёра).

---

## 🚀 Roadmap после v2.9.1

| Релиз      | Состав                                                                                            | Срок     |
| ---------- | ------------------------------------------------------------------------------------------------- | -------- |
| **v2.9.1** | Этот промт целиком: 2 Major AI-DOCX + 5 Minor + 4 ручные верификации                              | 3–4 дня  |
| v3.0.0     | Новые графики (cohort, sankey UTM→landing, what-if симулятор), event tracking, adoption dashboard | 2 недели |
| v3.1.0     | Logs API интеграция, scvi-tools для cohort cluster, AI roadmap suggestions                        | 3 недели |

После v2.9.1 → **финальная версия для презентации руководству ProductCamp без необходимости ручной правки в Word**.

---

## 📌 Контрольный inv-тест после всех фиксов

```typescript
// code/backend/tests/report/offline-audit.test.ts
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

it('v2.9.1 acceptance: full DOCX audit', async () => {
  const id = await generateSnapshot(snapshotWithAi);
  const buf = await downloadDocx(id);
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('word/document.xml')!.async('string');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');

  const paragraphs = doc.getElementsByTagName('w:p');
  let nonEmpty = 0,
    maxEmpty = 0,
    currentEmpty = 0;
  let emojiHeadings = 0,
    doubleNum = 0;
  let justified = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = Array.from(p.getElementsByTagName('w:t'))
      .map((t) => t.textContent)
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
        if (/^[🟢🔴🟡✅⚠️❌]/.test(text)) emojiHeadings++;
        if (/^\d+\.\s+\d+\./.test(text)) doubleNum++;
      }
    }
  }

  expect(nonEmpty).toBeLessThanOrEqual(400); // D-VERBOSE
  expect(maxEmpty).toBeLessThanOrEqual(1); // D-EMPTY-PAGE
  expect(emojiHeadings).toBe(0); // D-EMOJI
  expect(doubleNum).toBe(0); // D-DOUBLE-NUM
  expect(justified / nonEmpty).toBeGreaterThanOrEqual(0.9); // ГОСТ
  expect(xml).not.toMatch(/####|<p>|<br/); // MD leaks
  expect(xml).not.toMatch(/Анализ по каналам \(детальный\).+Анализ по каналам \(детальный\)/s); // дубль
});
```

Этот тест — единственный гейт для merge v2.9.1 в main.

---

> «v2.9.0 — production без AI. v2.9.1 — production с AI без оговорок.»
