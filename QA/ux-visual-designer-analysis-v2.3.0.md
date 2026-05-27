# UX / Visual Designer: анализ типографики, цвета, графиков, доступности v2.3.0

> Роль: UX-дизайнер (visual / UI designer). Прогон 2026-05-27 на живых данных
> счётчика <COUNTER_ID>. Стек: React 18 + Tailwind + Apache ECharts. Фокус — визуал,
> наглядность, доверие, доступность.

---

## 1. Резюме

Дашборд работает, но **визуально несобран**: ECharts-инстансы используют каждый
свою палитру; KPI-цифры одного веса с подписями; бейджи трёх разных оттенков для
одинакового смысла; графики обрезаны/растянуты по оси Y; светофор передаёт
смысл только цветом (без текстовой избыточности); таблицы без zebra-rows и
выравнивания чисел по правому краю; AI-нарратив рендерится плотным текстом без
typographic-ритма; страница /help (которая является эталоном красоты по словам
заказчика) — действительно лучшая, но даже она не использует единую сетку
с остальным дашбордом.

**Бренд-впечатление сейчас:** «внутренний инструмент с разнокалиберными виджетами».
**Должно быть:** «инструмент для стейкхолдерской презентации цифр».

---

## 2. Топ-15 визуальных находок (Severity 0–4)

### V-1 [4] Несогласованная палитра ECharts

- **Где:** /overview ринг каналов, /traffic бары, /behavior бары, /funnel воронка, /goals ринг — каждый со своим color-set.
- **Влияние:** один и тот же канал (Direct, Internal) меняет цвет от страницы к странице → подрыв доверия и узнаваемости.
- **Фикс:** единый объект `code/frontend/src/lib/chart-colors.ts`:
  ```ts
  export const CHANNEL_COLORS = {
    Direct: '#3B82F6', // blue-500
    Search: '#10B981', // emerald-500
    Internal: '#8B5CF6', // violet-500
    Mailing: '#F59E0B', // amber-500
    Messenger: '#06B6D4', // cyan-500
    SocialNetwork: '#EC4899', // pink-500
    Ad: '#EF4444', // red-500
    Link: '#84CC16', // lime-500
    Recommendation: '#A855F7', // purple-500
  } as const;
  ```
  Использовать во ВСЕХ ECharts (через опцию `color: getColors(seriesNames)`).

### V-2 [4] Метрики «визиты» и «заявки» имеют разные цвета на разных страницах

- **Где:** /overview line-chart визиты+заявки (синий+зелёный), /traffic тот же график (другие оттенки), /funnel ярко-фиолетовая воронка без подписи цветов.
- **Фикс:** **семантические токены** (отдельно от каналов):
  ```ts
  export const METRIC_COLORS = {
    visits: '#64748B', // slate-500 (нейтральный — фон/контекст)
    applications: '#0EA5E9', // sky-500
    payments: '#16A34A', // green-600 (важное!)
    b2bPipeline: '#A16207', // amber-700
    gap: '#DC2626', // red-600
  } as const;
  ```
  «Оплата» (зелёный) и «Заявка» (синий) ВСЕГДА разные цвета — отражает инвариант «заявка ≠ оплата».

### V-3 [4] Бейдж-светофор передаёт смысл только цветом (WCAG AA fail)

- **Где:** /goals, /funnel, /hypotheses (когда будет) — `🟢 / 🟡 / 🔴` плюс цветной фон.
- **Проблема:** дальтоники (8% мужчин) не различают красный/зелёный без подписи.
- **Фикс:** дублировать **иконкой формы** + текстом:
  - 🟢 → ⬤ + «Зелёный» / OK
  - 🟡 → ◐ + «Жёлтый» / WARN
  - 🔴 → ⬛ + «Красный» / STOP
  - Минимум: цвет + emoji + текст-метка. Иконки SVG в `<TrafficLight status="green" />`.

### V-4 [4] Контраст в бейджах рекомендаций недостаточен

- **Где:** /overview бейджи «значительно ниже среднего» — pastel-yellow background + pastel-orange text → contrast ratio ≈ 2.8:1 (WCAG AA требует ≥ 4.5:1 для нормального текста).
- **Фикс:**
  - Yellow badges: `bg-amber-100 text-amber-900` (контраст 7.5:1).
  - Red badges: `bg-red-50 text-red-900` (8.1:1).
  - Green badges: `bg-emerald-50 text-emerald-900` (8.6:1).
- Проверить через `axe-core` или Lighthouse: ≥ 90/100 a11y.

### V-5 [3] KPI-числа одного веса с подписями

- **Где:** /overview карточки «300 / 417 / 0 / 300», /funnel «57 034 / 417 / 0 / 0».
- **Проблема:** Tailwind по умолчанию даёт KPI text-3xl, label text-xs — но иерархия слабая.
- **Фикс:** строгая шкала:
  ```css
  .kpi-label {
    @apply text-xs font-medium uppercase tracking-wider text-slate-500;
  }
  .kpi-value {
    @apply text-4xl font-bold tracking-tight text-slate-900 tabular-nums;
  }
  .kpi-trend {
    @apply text-sm font-medium; /* зелёное +N, красное -N */
  }
  ```
  Использовать `tabular-nums` для выравнивания цифр (моноширинные циферки).

### V-6 [3] Числовая форматировка непоследовательна

- **Где:** «37 649» (с пробелом-разделителем) vs «37649» vs «4,925» (запятая) vs «0.7%» (точка) vs «23,1%» (запятая) — встречаются все варианты.
- **Фикс:** единая функция `formatNumber(n: number, opts)`:
  ```ts
  formatNumber(37649); // "37 649"   (NBSP-разделитель тысяч)
  formatNumber(0.007, { pct: 1 }); // "0,7 %"   (запятая — русская локаль)
  formatNumber(1234.56, { fix: 2 }); // "1 234,56"
  ```
  Использовать `Intl.NumberFormat('ru-RU', ...)` единственным источником.

### V-7 [3] Y-axis на /overview растянут до 10 000, столбцов почти не видно

- **Где:** /overview график «Визиты и заявки по дням».
- **Проблема:** ECharts сам выставил max=10000, но реальные значения 3000–6000 → много пустого пространства, тренд читается слабо.
- **Фикс:** ECharts `yAxis: { min: 'dataMin', max: 'dataMax', scale: true }`. Альтернатива — `interval: niceCeil(max / 5)`.

### V-8 [3] Bar-chart «Каналы — визиты» на /traffic — только 3 канала на оси, столбцы НЕ видны

- **Где:** /traffic первый график.
- **Фикс:** убрать обрезание top-N, повернуть xAxis label на 30–45° если их > 5, добавить tooltip.
- ECharts: `xAxis: { axisLabel: { rotate: 30, interval: 0 } }`.

### V-9 [3] Воронка на /funnel — мелкий текст, накладывается

- **Где:** /funnel SVG воронка: «Заявки B2C 417» написано поверх синего фона, читается плохо.
- **Фикс:**
  - текст на тёмном фоне — белый (currently dark blue text on dark purple fill);
  - увеличить шрифт до 14px;
  - вынести подписи слева/справа от воронки в отдельную легенду.

### V-10 [3] Топ страниц/UTM — числа выровнены по левому краю

- **Где:** все таблицы.
- **Фикс:** числовые колонки — `text-right tabular-nums`, текст — `text-left`. Zebra-rows `odd:bg-slate-50`. Sticky header при скролле длинных таблиц.

### V-11 [2] /help — эталон, но не использует ту же сетку, что остальные страницы

- **Где:** /help.
- **Проблема:** карточки в Help имеют другой стиль (border-radius 0.5rem vs 0.75rem на других страницах, padding 1.5rem vs 1rem).
- **Фикс:** вынести компонент `<Card>` в `code/frontend/src/components/Card.tsx`, использовать везде.
- Стиль карточки (единый):
  ```css
  .pca-card {
    @apply rounded-xl border border-slate-200 bg-white p-6 shadow-sm;
    @apply hover:shadow-md transition;
  }
  ```

### V-12 [2] /report превью — плотный текст без вертикального ритма

- **Где:** превью отчёта на /report.
- **Проблема:** строки одна за другой без пустых строк, без подзаголовков, AI-нарратив сливается с заголовками таблиц.
- **Фикс:**
  - использовать `prose` Tailwind plugin для всех нарративных блоков;
  - вертикальный ритм: `space-y-4` между параграфами, `mt-8` между секциями;
  - подзаголовки `h2` с тонкой нижней линией.

### V-13 [2] Прогресс-бар sync (10 стадий) — текстовый, не визуальный

- **Где:** /settings во время refresh.
- **Фикс:** stepper-компонент с 10 точками + текущая стадия подсвечена + лейбл «3/10: Загрузка каналов».
- Стиль:
  ```
  ⬤──⬤──⬤──◯──◯──◯──◯──◯──◯──◯
              ↑ «Загрузка каналов»
  ```

### V-14 [2] AI-анализ 5 секций без визуальной структуры

- **Где:** /report после генерации AI.
- **Фикс:**
  - каждая из 5 секций — своя карточка с иконкой:
    1. 📋 Контекст
    2. 🎯 Каналы и атрибуция
    3. 🔍 Поведение
    4. 📈 Воронка
    5. 💡 Рекомендации
  - между секциями — небольшой gap;
  - в DOCX/PDF — то же оформление (см. fix-prompt-v2.3.0 §4).

### V-15 [1] Иконки в навигации отсутствуют

- **Где:** топ-меню — только текст («Обзор Трафик Поведение…»).
- **Фикс:** добавить `lucide-react` icons:
  - Обзор → `Home`
  - Трафик → `Activity`
  - Поведение → `MousePointer`
  - Воронка → `Filter`
  - Цели → `Target`
  - Гипотезы → `Lightbulb`
  - Решения → `CheckCircle2`
  - B2B → `Briefcase`
  - Отчёт → `FileText`
  - История → `Clock`
  - Настройки → `Settings`
  - Справка → `HelpCircle`
- На мобиле — компактнее.

---

## 3. Мини-дизайн-система (предлагаю принять)

### 3.1. Цветовые токены (Tailwind theme.extend)

```js
// code/frontend/tailwind.config.js
theme: {
  extend: {
    colors: {
      // Семантика
      visits:       colors.slate[500],
      applications: colors.sky[500],
      payments:     colors.green[600],
      b2b:          colors.amber[700],
      gap:          colors.red[600],
      // Статусы
      success:      colors.emerald[600],
      warning:      colors.amber[500],
      danger:       colors.red[600],
      info:         colors.blue[500],
      // Поверхности
      surface: {
        DEFAULT:  '#FFFFFF',
        muted:    colors.slate[50],
        sunken:   colors.slate[100],
      },
    },
  },
}
```

### 3.2. Типографическая шкала

| Класс          | Размер           | Вес                   | Использование          |
| -------------- | ---------------- | --------------------- | ---------------------- |
| `text-display` | 36px / 2.25rem   | 700                   | hero на /help, /admin  |
| `text-h1`      | 28px / 1.75rem   | 700                   | заголовок страницы     |
| `text-h2`      | 22px / 1.375rem  | 600                   | секции внутри страницы |
| `text-h3`      | 18px / 1.125rem  | 600                   | подсекции / карточки   |
| `text-kpi`     | 32px / 2rem      | 700 + `tabular-nums`  | KPI числа              |
| `text-body`    | 15px / 0.9375rem | 400                   | основной текст         |
| `text-meta`    | 13px / 0.8125rem | 500 + `tracking-wide` | подписи, captions      |
| `text-mono`    | 13px / 0.8125rem | 400 + `font-mono`     | UUID, IDs, queryHash   |

Line-height: `leading-relaxed` (1.625) для нарративов, `leading-snug` (1.375) для заголовков, `leading-none` для KPI.

### 3.3. Сетка и отступы

- Контейнер: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- Vertical rhythm: между секциями `space-y-8`, внутри секции `space-y-4`.
- Grid карточек:
  - KPI (4 карточки): `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
  - 2-колоночный (график + таблица): `grid-cols-1 lg:grid-cols-2 gap-6`.
- Border-radius: `rounded-xl` (12px) для всех карточек/больших элементов, `rounded-lg` (8px) для inputs, `rounded-md` (6px) для бейджей.

### 3.4. Стиль графиков (ECharts defaults)

```ts
export const ECHARTS_THEME = {
  textStyle: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 },
  title: { textStyle: { fontWeight: 600, fontSize: 14, color: '#0F172A' } },
  legend: { textStyle: { color: '#475569' }, itemGap: 16 },
  grid: { left: 60, right: 24, top: 48, bottom: 56, containLabel: true },
  tooltip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    textStyle: { color: '#0F172A' },
    extraCssText: 'box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08)',
  },
  xAxis: {
    axisLine: { lineStyle: { color: '#CBD5E1' } },
    axisLabel: { color: '#64748B' },
    splitLine: { lineStyle: { color: '#F1F5F9' } },
  },
  yAxis: {
    axisLine: { show: false },
    axisLabel: { color: '#64748B' },
    splitLine: { lineStyle: { color: '#F1F5F9' } },
    nameTextStyle: { color: '#64748B' },
  },
};
```

Все ECharts инициализируются через `echarts.registerTheme('pca', ECHARTS_THEME)` + `echarts.init(el, 'pca')`.

---

## 4. Чек-лист WCAG AA

| Пункт                                         | Сейчас                    | Должно быть                                                                |
| --------------------------------------------- | ------------------------- | -------------------------------------------------------------------------- |
| Контраст текста ≥ 4.5:1 (normal), 3:1 (large) | 🔴 бейджи 2.8:1           | 🟢 ≥ 7:1                                                                   |
| Не только цветом                              | 🔴 светофор без текста    | 🟢 цвет + иконка + текст                                                   |
| Фокус видим (focus-visible)                   | 🟡 по умолчанию           | 🟢 явный `ring-2 ring-blue-500 ring-offset-2`                              |
| Размер кликабельных зон ≥ 44×44px             | 🟡 чекбоксы фильтра 16×16 | 🟢 обернуть в `<label>` с padding                                          |
| Alt у изображений / aria-label у иконок       | 🔴 у бейджей нет          | 🟢 `<TrafficLight status="green" aria-label="Зелёный свет: всё хорошо" />` |
| Screen reader для графиков                    | 🔴 нет                    | 🟢 ECharts `aria.show: true` + табличный fallback                          |
| Зум 200% — лейаут не ломается                 | 🟡 не проверено           | 🟢 e2e тест с zoom                                                         |
| Keyboard navigation по всем                   | 🟡 базово работает        | 🟢 tab-order, escape-close drawers                                         |
| Не использовать только цвет для статусов      | 🔴                        | 🟢 иконки + текст                                                          |
| `prefers-reduced-motion`                      | 🔴 нет                    | 🟢 disable transitions если выставлено                                     |
| Lighthouse a11y score                         | (не измерено)             | ≥ 90 на каждой странице                                                    |

---

## 5. Быстрые победы (Quick wins за <1 день каждая)

| Победа                                | Усилие | Импакт   | Файлы                              |
| ------------------------------------- | ------ | -------- | ---------------------------------- |
| Единая палитра каналов в ECharts      | 2ч     | 5        | `lib/chart-colors.ts` + все routes |
| `tabular-nums` на все числа           | 30мин  | 4        | global CSS                         |
| `Intl.NumberFormat('ru-RU')` обёртка  | 1ч     | 4        | `lib/format.ts`                    |
| Иконки в навигации (lucide-react)     | 1ч     | 3        | `Layout.tsx`                       |
| Y-axis: `scale: true` для line-charts | 30мин  | 4        | overview.tsx                       |
| Бейджи: dark text on light bg         | 1ч     | 5 (a11y) | tokens + badges                    |
| Светофор: добавить текст-метку        | 30мин  | 5 (a11y) | `<TrafficLight>`                   |
| Zebra-rows для таблиц                 | 30мин  | 3        | global CSS                         |
| Числа в таблицах — `text-right`       | 30мин  | 3        | global CSS                         |
| ECharts theme + register              | 1ч     | 4        | `lib/echarts-theme.ts`             |

10 побед = ~9 часов работы, импакт огромный.

---

## 6. Топ-3 «нельзя оставить» к v2.4.0

1. **Единая палитра + семантические токены (V-1, V-2, V-3).** Без этого все остальные правки бесполезны — пользователь продолжает видеть «лоскутное одеяло».
2. **Контраст бейджей ≥ 4.5:1 + текстовая избыточность светофора (V-3, V-4).** WCAG AA блокер для публичного использования.
3. **Числовая форматировка (V-6) + `tabular-nums` (V-5).** «Профессиональные» отчёты узнаются по аккуратным цифрам.

---

## 7. Что не оценивал

- Анимации/переходы между состояниями — отдельный motion-design-pass.
- Tone of voice в текстах ошибок — отдельный copywriting-pass (UX writer).
- Брендирование (логотип ProductCamp, фавикон) — отдельный brand-pass.
- DOCX/PDF визуал — частично в fix-prompt-v2.3.0 §4 (ГОСТ), но шрифты Times New Roman 14pt в DOCX vs Inter в UI создают «два разных продукта». В версии v2.5.0 рекомендую DOCX/PDF тоже использовать Inter (если шрифт лицензионно совместим), либо оставить Times New Roman, но синхронизировать акценты (цвета бейджей одинаковы).
