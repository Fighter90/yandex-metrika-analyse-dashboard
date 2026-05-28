# Fix-Prompt v2.9.0 — переработка DOCX/PDF отчётов

> Дата: 2026-05-28. Базис: анализ реального DOCX (192 КБ, snapshotId 97a7864d) и PDF (878 КБ).
> Цель: довести отчёты до состояния «отдать руководству без стыда».
> Срок: **2-3 дня**.

---

## 🔴 Что не так в текущем DOCX/PDF (анализ uploaded files)

### 1. Пустые разделы и заголовки без контента

- **15+ подряд идущих пустых параграфов** в документе.
- Заголовки в TOC, под которыми НЕТ содержательного текста: «Каналы, UTM и Аудитория» (стр. 23), «Страницы и Воронка» (стр. 25), «Риски и Рекомендации», «Гипотезы и Дорожная карта», «Итоговый вывод» — это AI-плашки, под которыми может быть пусто, если AI-анализ НЕ сгенерирован, но раздел всё равно вставлен.
- **Эффект**: пользователь видит «1. Краткие итоги... [3 пустые страницы]... 6. Анализ по каналам».

### 2. Дублирование заголовков и сломанная нумерация

- В TOC: «1. Краткие итоги», «2. Рекомендации», ..., **«11. 1. Где мы сейчас»**, **«12. 2. Gap до цели»**, **«13. 3. Анализ каналов»** — это AI-секция вставила свою внутреннюю нумерацию поверх внешней.
- Дублируются названия: «Анализ по каналам (детальный)» (раздел 6) и «Анализ по каналам» (раздел 8) — два разных раздела с почти одним именем.
- «Сводная таблица приоритетов» появляется в нескольких местах.

### 3. HTML/Markdown теги в визуальном тексте

- Эмодзи в заголовках: **🔴 Ключевые риски**, **✅ Рекомендации** — оставлены сырыми.
- В тексте видны места, где AI-нарратив выдавал markdown (####, \*\*, нумерованные списки), и они не полностью преобразовались в Word-стили.

### 4. Огромный сырой dump в конце

- Приложение с данными содержит **~700 строк** в формате «2026-05-22 · Direct traffic: визитов 363, заявок 2 (CR 0.6%), отказы 19.6%» — каждый канал × каждый день. Это технически правильно (anti-hallucination — каждое число прослеживается), но для отчёта руководству это **шум**.

### 5. Текст НЕ выровнен по ширине

- Основной текст рендерится по левому краю с рваным правым.
- В ГОСТ Р 7.32-2017 требуется выравнивание по ширине (justified).

### 6. Кнопки экспорта НЕ disabled

- На /report кнопки «Export DOCX» и «Export PDF» активны сразу, даже когда снапшот ещё не сформирован.
- AI-анализ может быть НЕ сгенерирован, но экспорт всё равно даёт документ — с пустыми AI-разделами и заголовками без контента (см. дефект №1).

---

## 🎯 План фикса (3 дня)

### День 1 — UX кнопок и состояний (frontend)

#### 1.1. Кнопки экспорта disabled до формирования снапшота

**Где:** `code/frontend/src/routes/report.tsx`

**Сейчас:**

```tsx
<button onClick={generateSnapshot}>Сформировать срез данных</button>
<button onClick={() => exportDocx(snapshotId)}>Export DOCX</button>
<button onClick={() => exportPdf(snapshotId)}>Export PDF</button>
<button onClick={() => generateAi(snapshotId)}>Сгенерировать AI-анализ</button>
```

**Должно быть:**

```tsx
const [snapshot, setSnapshot] = useState(null);
const [aiInsights, setAiInsights] = useState(null);
const [generating, setGenerating] = useState(false);

const snapshotReady = !!snapshot;
const aiReady = !!aiInsights;

<button onClick={generateSnapshot} disabled={generating}>
  Сформировать срез данных
</button>

<button
  onClick={() => generateAi(snapshot.id)}
  disabled={!snapshotReady || aiReady || generating}
  title={!snapshotReady ? 'Сначала сформируйте срез данных' : ''}
>
  Сгенерировать AI-анализ
</button>

<button
  onClick={() => exportDocx(snapshot.id)}
  disabled={!snapshotReady || generating}
  title={!snapshotReady ? 'Сначала сформируйте срез данных' : ''}
>
  Export DOCX
</button>

<button
  onClick={() => exportPdf(snapshot.id)}
  disabled={!snapshotReady || generating}
  title={!snapshotReady ? 'Сначала сформируйте срез данных' : ''}
>
  Export PDF
</button>
```

**CSS:**

```css
button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #cccccc;
}
```

**Acceptance:**

- [ ] На свежем заходе на /report — Export DOCX/PDF и AI-кнопка задизаблены.
- [ ] После клика «Сформировать срез» — все 3 становятся активными.
- [ ] AI-кнопка disabled после успешной генерации (нельзя сгенерить дважды).
- [ ] Tooltip объясняет, почему disabled.

#### 1.2. Превью отчёта на /report — рендерить только если есть снапшот

**Сейчас:** Превью HTML рендерится всегда, даже без снапшота — показывает пустые заголовки.

**Должно быть:**

```tsx
{
  !snapshotReady && (
    <EmptyState
      icon={<FileText />}
      title="Срез данных не сформирован"
      description="Нажмите «Сформировать срез данных», чтобы собрать неизменяемый снимок и увидеть превью отчёта"
    />
  );
}

{
  snapshotReady && <ReportPreview snapshot={snapshot} aiInsights={aiInsights} />;
}
```

---

### День 2 — Чистка структуры DOCX/PDF (backend)

#### 2.1. Убрать пустые разделы

**Где:** `code/backend/src/report/docx/builder.ts` и `pdf/builder.ts`

**Сейчас:** Все 15+ разделов добавляются в документ независимо от наличия контента.

**Должно быть:** перед вставкой раздела проверять наличие контента:

```typescript
function pushSection(out: Paragraph[], heading: string, content: Paragraph[] | null) {
  if (!content || content.length === 0) return; // пропустить пустую секцию
  // также пропустить, если все параграфы пустые
  const hasContent = content.some((p) => extractText(p).trim().length > 0);
  if (!hasContent) return;
  out.push(headingParagraph(heading));
  out.push(...content);
}

// При сборке:
const sections: Paragraph[] = [];
pushSection(sections, '1. Краткие итоги', buildSummary(snapshot));
pushSection(sections, '2. Рекомендации', buildRecommendations(snapshot));
// AI-разделы только если aiInsights сгенерирован:
if (snapshot.aiInsights) {
  pushSection(sections, 'Каналы, UTM и Аудитория', renderAi(snapshot.aiInsights.channels));
  pushSection(sections, 'Страницы и Воронка', renderAi(snapshot.aiInsights.behavior));
  pushSection(sections, 'Риски и Рекомендации', renderAi(snapshot.aiInsights.risks));
  pushSection(sections, 'Гипотезы и Дорожная карта', renderAi(snapshot.aiInsights.hypotheses));
  pushSection(sections, 'Итоговый вывод', renderAi(snapshot.aiInsights.conclusion));
}
```

**Acceptance:**

- [ ] Если AI не сгенерирован — DOCX содержит только 6-7 базовых разделов, без AI-плашек.
- [ ] Если AI сгенерирован — добавляются 5-6 AI-разделов с контентом.
- [ ] Нет двух пустых параграфов подряд.
- [ ] Inv-тест: `expect(extractText(docx)).not.toMatch(/^\s*$/m, 2)` (не больше одной пустой подряд).

#### 2.2. Единая нумерация разделов и устранение дублей

**Сейчас:** AI-секции имеют свою внутреннюю нумерацию «1. Где мы сейчас», которая конкатенируется с внешней «11. 1. Где мы сейчас».

**Должно быть:**

- AI-prompt инструктирует Claude **НЕ нумеровать собственные подразделы** (заголовки — обычным жирным шрифтом без «1.», «2.»).
- Единая нумерация разделов в самом builder'е DOCX:

```typescript
let n = 0;
const numberedHeading = (title: string) => h2(`${++n}. ${title}`);
```

- Объединить дубликаты: «Анализ по каналам (детальный)» и «Анализ по каналам» — в один раздел «Анализ по каналам трафика». «Сводная таблица приоритетов» — единый раздел в конце.

**Список разделов финального документа (target):**

1. Краткие итоги (KPI-блок)
2. Воронка визит → заявка → оплата (с графиком + блок 🟢/🔴)
3. Анализ по каналам трафика (с графиком + таблица + блок 🟢/🔴)
4. UTM-атрибуция (таблица топ-10 + блок 🟢/🔴)
5. География и устройства (таблицы + блок 🟢/🔴)
6. Страницы входа (таблица топ-10 + блок 🟢/🔴)
7. B2B-пайплайн (таблица сделок + блок 🟢/🔴)
8. AI-анализ — Каналы, UTM, Аудитория _(если есть)_
9. AI-анализ — Страницы и Воронка _(если есть)_
10. AI-анализ — Риски и Рекомендации _(если есть)_
11. AI-анализ — Гипотезы и Дорожная карта _(если есть)_
12. AI-анализ — Итоговый вывод _(если есть)_
13. Decision Log (предполагаемые решения) _(если есть)_
14. Заключение
15. Источники данных
16. Приложение А. Глоссарий
17. Приложение Б. Детальная разбивка (channel × день — оставить только при флаге `includeRawAppendix=true`)

#### 2.3. Очистка AI-нарратива от Markdown/HTML

**Где:** `code/backend/src/report/ai/sanitize.ts` (создать или дополнить)

```typescript
import sanitizeHtml from 'sanitize-html';

export function sanitizeAiHtml(raw: string): { paragraphs: ParsedBlock[] } {
  // 1. AI prompt должен возвращать чистый HTML (разрешённые теги: h2, h3, p, ul, ol, li, table, tr, td, strong, em).
  // 2. Если в ответе всё же есть Markdown — конвертировать через marked, потом санитировать.
  let html = raw;
  if (/^#{1,4}\s/m.test(html) || /^\*\*\*?/m.test(html)) {
    const { marked } = require('marked');
    html = marked.parse(html);
  }
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
      // Эмодзи в заголовках — оставляем как UTF-8 символы (они нормально рендерятся в DOCX)
      // но префикс типа "🔴 Ключевые риски" → убираем эмодзи и оставляем "Ключевые риски"
    },
    textFilter: (text) => {
      return text
        .replace(/^[🟢🔴🟡⚠️✅❌💡]\s*/gm, '') // убрать эмодзи в начале строки
        .replace(/####\s*/g, '') // убрать сырые ### если остались
        .replace(/\*\*\*?/g, ''); // убрать **
    },
  });
  return parseHtmlToParagraphs(clean);
}
```

**В builder:**

```typescript
function renderAi(htmlBlock: string): Paragraph[] {
  const { paragraphs } = sanitizeAiHtml(htmlBlock);
  return paragraphs
    .map((b) => {
      if (b.type === 'heading') return h3(b.text);
      if (b.type === 'list') return b.items.map((item) => bulletParagraph(item));
      if (b.type === 'table') return docxTable(b);
      return justifiedParagraph(b.text);
    })
    .flat();
}
```

**Acceptance:**

- [ ] В DOCX/PDF НЕТ сырых `####`, `**`, `1.`, `🔴`, `<p>`, `<br/>`.
- [ ] AI-заголовки используют стиль Heading 3 без эмодзи в начале.
- [ ] Списки используют numbering, не «• Item» вручную.

#### 2.4. Выравнивание текста по ширине (ГОСТ)

**Где:** все Paragraph в builder.ts.

```typescript
function justifiedParagraph(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, // ← это
    spacing: { line: 360, lineRule: 'auto', after: 120 }, // 1.5 межстрочный
    indent: { firstLine: 720 }, // красная строка 1.27 см
    children: [new TextRun({ text, font: 'Times New Roman', size: 28 })], // 14pt
  });
}
```

**Заголовки** — выравнивание `LEFT` (как в курсовой работе), кроме титульного — `CENTER`.

**Acceptance:**

- [ ] Все абзацы основного текста выровнены по ширине (визуальная проверка в Word).
- [ ] Красная строка 1.27 см.
- [ ] Межстрочный 1.5.

---

### День 3 — Сокращение приложения и финальный аудит

#### 3.1. Сократить приложение «Детальная разбивка»

**Сейчас:** ~700 строк формата «2026-05-22 · Direct traffic: визитов 363, заявок 2 (CR 0.6%), отказы 19.6%».

**Должно быть:** заменить на **компактную таблицу**:

| Дата \ Канал | Direct        | Search    | Internal | ... |
| ------------ | ------------- | --------- | -------- | --- |
| 22.05        | 363 (CR 0.6%) | 92 (1.1%) | 20 (0%)  | ... |
| 23.05        | ...           | ...       | ...      | ... |

Либо вынести в отдельный лист Excel-приложения, ссылка в DOCX:

> «Полная разбивка по каналам и дням — см. приложение productcamp-report-{snapshotId}-appendix.xlsx».

Параметр в API: `POST /api/report/generate { format: 'docx', includeRawAppendix: false }` — по умолчанию `false`.

**Acceptance:**

- [ ] DOCX без сырого приложения ≤ 50 страниц вместо текущих ~70.
- [ ] Если `includeRawAppendix=true` — приложение в виде таблицы, не списка строк.

#### 3.2. Превью на /report = идентично DOCX

**Сейчас:** превью на экране отличается структурой от итогового DOCX (превью показывает 17 разделов, DOCX — иногда другие).

**Должно быть:** **единый рендерер** `code/shared/src/report/sections.ts`, который возвращает массив секций:

```typescript
type Section = {
  id: string;
  title: string;
  content: SectionContent[];
};

export function buildSections(snapshot: Snapshot): Section[] {
  const sections: Section[] = [
    { id: 'summary', title: '1. Краткие итоги', content: [...] },
    { id: 'funnel', title: '2. Воронка визит → заявка → оплата', content: [...] },
    // ...
  ];
  return sections.filter(s => s.content.length > 0); // выкинуть пустые
}
```

Frontend (превью) и backend (DOCX/PDF builder) используют один и тот же `buildSections`.

**Acceptance:**

- [ ] То, что видит пользователь в превью /report — идентично итоговому DOCX/PDF.
- [ ] Inv-тест: `expect(htmlSectionsCount).toBe(docxSectionsCount)`.

---

## 🎯 AI prompt — обновление

`code/backend/src/report/ai/prompts/insights.md`:

```
Ты — аналитик. Получаешь снимок данных в JSON формате.
Сгенерируй 5 секций отчёта в формате HTML.

ВАЖНО:
1. Возвращай чистый HTML с разрешёнными тегами: <h3>, <p>, <ul>, <ol>, <li>, <table>, <tr>, <td>, <strong>, <em>.
2. НЕ используй Markdown: никаких #, ##, **, *.
3. НЕ начинай заголовки с эмодзи (🔴, ✅, 🟢). Эмодзи можно использовать только в тексте абзацев как акцент.
4. НЕ нумеруй собственные подзаголовки — нумерация добавляется снаружи.
5. Опирайся ТОЛЬКО на числа из snapshot. Не выдумывай.
6. Каждый абзац ≤ 4-5 предложений, без воды.

Структура ответа:
{
  "summary": "<h3>Что главное</h3><p>...</p>",
  "channels": "<h3>...</h3><p>...</p>",
  "behavior": "<h3>...</h3><p>...</p>",
  "risks": "<h3>...</h3><p>...</p>",
  "hypotheses": "<h3>...</h3><p>...</p>",
  "conclusion": "<h3>...</h3><p>...</p>"
}
```

---

## 📋 Финальный чек-лист приёмки v2.9.0

### UX/UI

- [ ] До нажатия «Сформировать срез данных» — Export DOCX/PDF и AI-кнопка задизаблены.
- [ ] AI-кнопка задизаблена после успешной генерации (нельзя дважды).
- [ ] Tooltip объясняет, почему кнопка задизаблена.
- [ ] Превью отчёта появляется только при наличии снапшота.

### DOCX/PDF структура

- [ ] Нет двух пустых параграфов подряд.
- [ ] Все секции содержат осмысленный контент (не пустые заголовки).
- [ ] Единая сквозная нумерация разделов (1, 2, 3...), AI-нарратив без своей нумерации.
- [ ] Нет дублирующихся секций (например, «Анализ по каналам» один раз).

### Чистота AI-нарратива

- [ ] Нет сырых Markdown-тегов (####, \*\*, нумерованные списки в виде «1. ...»).
- [ ] Нет HTML-тегов в тексте (<p>, <br>).
- [ ] Эмодзи не идут в начале заголовков.

### Форматирование (ГОСТ Р 7.32-2017)

- [ ] Times New Roman 14pt.
- [ ] Межстрочный 1.5.
- [ ] Поля 30/15/20/20 мм.
- [ ] Текст выровнен по ширине.
- [ ] Красная строка 1.27 см.
- [ ] Нумерация страниц внизу по центру.

### Содержание

- [ ] Превью на /report идентично итоговому DOCX/PDF.
- [ ] 3 PNG-графика встроены.
- [ ] После каждого графика — блок «🟢 Что хорошо / 🔴 Что плохо» (с цветным shading).
- [ ] Приложение с детальной разбивкой ≤ 5 страниц (компактная таблица или вынесено в xlsx).

### Размеры

- [ ] DOCX итого ≤ 50 страниц (было ~70 с сырым приложением).
- [ ] DOCX < 250 КБ (было 192 КБ — после чистки ~150 КБ).
- [ ] PDF без duplicate-разделов — ≤ 1 МБ.

---

## 🚀 Roadmap

| Релиз      | Состав                                                                     | Срок     |
| ---------- | -------------------------------------------------------------------------- | -------- |
| **v2.9.0** | Этот промт целиком: UX кнопок, чистка структуры, выравнивание, sanitize AI | 2-3 дня  |
| v3.0.0     | Новые графики (cohort, sankey UTM→landing, what-if), event tracking        | 2 недели |

После v2.9.0 — релиз готов для презентации руководству ProductCamp **без необходимости ручной правки в Word**.
