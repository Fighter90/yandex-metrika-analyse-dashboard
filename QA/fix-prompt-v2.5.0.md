# Fix-Prompt v2.5.0 — финальный консолидированный план

> Целевой агент: **Claude Code** в репозитории `metrika_analyse_dashboard`.
> Дата: 2026-05-27.
> **Это финальный консолидированный промт.** Содержит все находки трёх QA-прогонов:
>
> - `qa/fix-prompt-v2.3.0.md` — баги, ГОСТ-отчёт, новые страницы методологии.
> - `qa/fix-prompt-v2.4.0.md` — IA-перегруппировка, формы, состояния (UX-designer).
> - `qa/ux-visual-designer-analysis-v2.3.0.md` — визуал, палитра, WCAG (этот прогон).
>
> Используется для финального планирования релизов v2.4.0 → v2.5.0 → v2.6.0 → v3.0.0.
> Старые fix-промты сохранены для трассировки, но **в работе использовать только этот**.

---

## 0. Принципы (поверх `CLAUDE.md`)

1. **Anti-hallucination above all** — каждая цифра до `raw_responses`.
2. **Согласованность данных** между страницами — Blocker, если расходятся.
3. **Заявка ≠ оплата** — везде в коде, UI, отчётах разделены.
4. **Гипотеза без формата гипотезы — не гипотеза** — UI блокирует Save.
5. **ICE = I × C × E** (произведение, ADR-005).
6. **Decision Log замыкает цикл** — без записи решение не считается принятым.
7. **Единая палитра / типографика / отступы** — мини-DS из v-visual §3.
8. **WCAG AA** — контраст ≥ 4.5:1, не только цветом, фокус видим.
9. **ГОСТ Р 7.32-2017** для DOCX/PDF + блок «🟢/🔴» после каждого графика.
10. **Spec-Driven Development** — нетривиальная фича → спека → review → tests → impl.

---

## 1. Hotfix v2.4.0 (катить за 1 неделю)

**Цель релиза:** разблокировать сборку, починить ключевые расхождения и базу визуала.

### 1.1. Blocker (день 1)

- [ ] `code/backend/src/report/docx/builder.ts:72`: `'CLEAR'` → `'clear'`.
- [ ] 27 ESLint-ошибок: убрать unused vars, `.qwen/worktrees/**` в `eslint.config.js` ignores.
- [ ] `pnpm format` на 18 файлах из жалоб Prettier.
- [ ] Acceptance: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` — зелёное.

### 1.2. Согласованность данных (день 2–3)

- [ ] Создать `code/backend/src/analytics/factsource.ts` — единственный источник для `getVisitsForPeriod`, `getApplicationsForPeriod`, `getPaymentsForPeriod`.
- [ ] Все роуты `/api/metrics/*` и `/api/report/*` читают через factsource.
- [ ] Inv-тест: для любого period — Behavior.visits === Funnel.visits === Goals.visits === Snapshot.visits.
- [ ] UTM-покрытие: одно значение во всех 9 местах упоминания (Overview, Traffic — сейчас 100%/0%).
- [ ] CR ∈ [0%, 100%]: если больше — переименовать в «events/visit», убрать «✅ Лучший CR».

### 1.3. Дедуп ETL (день 3)

- [ ] Миграция `010_unique_channel_stats.sql`: `UNIQUE INDEX (date, channel, segment)`.
- [ ] То же для `utm_stats`, `geo_device_stats`, `pages_stats`, `exit_pages_stats`.
- [ ] Скрипт миграции существующих данных `scripts/dedupe-stats.ts`.
- [ ] ETL `INSERT` → `INSERT … ON CONFLICT UPDATE`.
- [ ] Дедупликация URL страниц входа: нормализовать (без query/fragment), сохранять оригинал в `raw_url`.
- [ ] Acceptance: в снапшоте за 14 дней ≤ 120 строк `channel_stats` (не 2293).

### 1.4. Primary goal × UI labels (день 4)

- [ ] `@pca/shared/format-goal.ts`: `formatGoalLabel(goal): { title, valueLabel, isPaid, showEstimate }`.
- [ ] Если `type='e_purchase'` → «Оплат», `isPaid=true`, `showEstimate=false`.
- [ ] Иначе → «Заявок», `isPaid=false`.
- [ ] Удалить hard-coded `× 0.3`; если нужна оценка — читать из таблицы `assumptions` + ADR-009.
- [ ] Использовать на /overview, /goals, /funnel, /report, в снапшоте, в DOCX/PDF.

### 1.5. Базовая мини-DS (день 5)

- [ ] `code/frontend/src/lib/chart-colors.ts` — единая палитра CHANNEL_COLORS + METRIC_COLORS.
- [ ] `code/frontend/src/lib/format.ts` — `formatNumber`, `formatPercent`, `formatDate` через `Intl.NumberFormat('ru-RU')`.
- [ ] `code/frontend/src/lib/echarts-theme.ts` — единая тема, `echarts.registerTheme('pca')`.
- [ ] Все ECharts-инстансы инициализируются с `'pca'`-темой и берут цвета из CHANNEL_COLORS.
- [ ] Глобальный CSS: `.tabular-nums` на всех числах, zebra-rows таблицы, `text-right` на числовых колонках.

### 1.6. WCAG AA basics (день 5)

- [ ] Бейджи переписать на dark text + light bg (контраст ≥ 7:1).
- [ ] Светофор: компонент `<TrafficLight status="green" />` с **цвет + иконка + текст**.
- [ ] Фокус-видимый: `focus-visible:ring-2 ring-blue-500 ring-offset-2` глобально.
- [ ] Прогон Lighthouse a11y — ≥ 90 на каждой странице.

### 1.7. Документация-sync (день 5)

- [ ] `scripts/sync-versions.ts` — обновляет все шапки доков из `package.json`.
- [ ] Pre-commit hook.
- [ ] CHANGELOG: добавить v0.12.0 (skip note), починить compare-ссылки, актуализировать до v2.4.0.

---

## 2. Фичи v2.5.0 (1 неделя после v2.4.0)

**Цель релиза:** ядро методологии в UI + ГОСТ-отчёт + IA-перегруппировка.

### 2.1. Перегруппировка меню (P0)

- Spec: `docs/specs/010-nav-grouping.md`.
- 3 кластера: Анализ (5) / Действие (3) / Вывод (2) + ⚙ ❓.
- Мобильный гамбургер: collapse по секциям.
- Иконки lucide-react на всех пунктах.

### 2.2. Страницы /hypotheses + /decisions + /b2b (P0)

- Spec: `docs/specs/011-hypothesis-form-stepper.md`, 012-decisions.md, 013-b2b-crud.md.
- **Stepper-форма гипотезы** — 5 шагов: Сформулировать → Допущения → Методы → ICE → Светофор+дедлайн+snapshot.
- react-hook-form + zod-схема (отвергает невалидные).
- Кнопка «Сохранить как DRAFT» на каждом шаге.
- Подсказки из `.claude/skills/hypothesis-check/SKILL.md`.
- /decisions — Decision Log с привязкой к снапшоту и гипотезе.
- /b2b — CRUD + kanban-доска статусов.
- Все три страницы доступны через навигацию и через deep-link с предзаполнением.

### 2.3. Deep-links «слабое место → новая гипотеза» (P0)

- `code/frontend/src/lib/hypothesis-prefill.ts`: `buildHypothesisUrl({...})`.
- Бейджи слабых мест на /overview, /traffic, /behavior — кликабельны.
- На /hypotheses/new — `useSearchParams()` распарсить, передать в form defaults + привязать snapshot.

### 2.4. Пустые состояния на 6+ экранах (P0)

- Компонент `<EmptyState icon title description primaryCta secondaryCta />`.
- Применить на /history, /report, /hypotheses, /decisions, /b2b, /goals (если GOAL_ID null).

### 2.5. ГОСТ-отчёт DOCX/PDF (P0)

- Spec: `docs/specs/014-report-gost.md`.
- Структура: Титул → Реферат → TOC → Введение → Основная часть (15 разделов) → Заключение → Источники → Приложения.
- Поля 30/15/20/20мм, Arial/Times 11–12pt, line-spacing 1.5.
- **После каждого графика — блок «🟢 Что хорошо / 🔴 Что плохо»** с табличными ячейками shading в DOCX и div с background в PDF.
- Графики встроены как PNG (server-side render через `node-canvas` или Puppeteer).
- DOCX и PDF из одного snapshotId — SHA-256 идентичны (без учёта zip/pdf timestamps).
- В UI превью — TOC слева sticky + якорные ссылки.

### 2.6. Header-badge источника данных (P1)

- Sticky-полоса под навигацией.
- 🟢 / 🟡 / 🔴 / ⚪ по правилам времени sync.
- `GET /api/health` отдаёт `lastSyncAt = MAX(synced_at)`.

### 2.7. Onboarding-карточка (P1)

- На /overview при первом визите (localStorage флаг).
- 3 шага + кнопка «Тур 45с» (shepherd.js).

---

## 3. Дополнительный визуал v2.6.0 (1 неделя)

### 3.1. Полная мини-DS

- Tailwind theme.extend: семантические токены, типографическая шкала, отступы, border-radius.
- Компонент `<Card>` — единый стиль на всех страницах (включая /help).
- Компонент `<Kpi>` с обязательными `label`, `value`, опциональным `trend` (WoW дельта).
- Tooltip ⓘ «как рассчитано» — `<MetricInfo>` с формулой и raw_response_id.

### 3.2. Графики — улучшения

- Y-axis: `scale: true` везде.
- xAxis labels на bars: rotate 30°, interval: 0.
- Воронка: подписи слева/справа от формы, шрифт 14px.
- Sparkline в каждой строке UTM-таблицы (`SparklineCell`).

### 3.3. /report улучшения

- TOC слева + sticky.
- 5 секций AI-нарратива каждая со своей иконкой.
- Dropdown экспорта: DOCX / PDF / Copy Link / Email.

### 3.4. /history улучшения

- Фильтр по периоду снапшота.
- Server-side пагинация по 10.
- Кнопка удаления с подтверждением (DELETE /api/report/snapshot/:id).
- Тэги «AI-анализ» / «привязан к H-007».
- Поиск по snapshotId.

### 3.5. /settings улучшения

- 3-секционная collapse-структура (Источник / AI / Расширенное).
- Sticky-summary сверху «Счётчик ХХХ · Цель: YYY · AI: ✅».
- Группировка GOAL_ID select (Активные/Архивные) + bage типа + search.
- Прогресс-бар sync: stepper с 10 точками + текущая стадия подсвечена.

### 3.6. Мобильная версия

- E2E проект `mobile-iphone-14` в Playwright.
- Reflow таблиц в карточки на < 768px.
- FilterBar — bottom-sheet «Фильтры (3)».
- ECharts: `chart.resize()` на window.resize.

---

## 4. Product Analytics + Adoption v2.6.0

### 4.1. События `pca.*`

- Создать `code/backend/src/usage/events.ts` + миграция `011_usage_events.sql`.
- Frontend: `useTrackEvent()` хук.
- События: `pca.page.view`, `pca.filter.change`, `pca.sync.start/finish`, `pca.hypothesis.create/update`, `pca.decision.create`, `pca.report.generate`, `pca.ai.insights.generate`, `pca.deep_link.click`, `pca.export.click`, `pca.error.shown`.

### 4.2. /admin/adoption (внутренний)

- DAU / WAU команды.
- Конверсия sync → report → hypothesis → decision.
- Автовердикт зелёный/жёлтый/красный из CLAUDE.md (≥3 пользователей, ≥5+5 гипотез, ≥3 решений).
- Топ страниц по числу просмотров.

---

## 5. Большие фичи v3.0.0 (2 недели)

### 5.1. Новые графики

- Cohort retention heatmap.
- Sankey «UTM-source → landing → goal».
- Heat-map «время суток × день недели».
- Funnel by channel (stacked).
- Time-to-payment distribution.
- B2B pipeline velocity (Sankey).
- WoW/MoM сравнения пунктиром на всех графиках.

### 5.2. What-if симулятор

- Слайдеры «увеличить CR mailing с 0% до 1%» → пересчёт «сколько оплат добавит».
- ECharts + live recompute.

### 5.3. Weekly digest

- Scheduled-task: каждый понедельник 9:00.
- Генерит снапшот + 1-страничный PDF + рассылка в Slack (опционально).

### 5.4. Шаблоны гипотез

- На /hypotheses/new — выбор шаблона:
  - «Канал X не конвертит» (предзаполн. 70%).
  - «Страница Y имеет высокий bounce».
  - «UTM-кампания Z — нерелевантный трафик».
  - «B2B-сегмент A — нужен персональный аутрич».
- Связь с `.claude/skills/synthetic-custdev/SKILL.md` — кнопка «Запустить синтетический кастдев».

### 5.5. Decision Log Slack-bot

- Каждая запись DL → пост в канал команды.

---

## 6. Метрики приёмки (единый список для всех релизов)

### 6.1. Технические (Blocker если красное)

- [ ] `pnpm typecheck && pnpm lint && pnpm format:check && pnpm -r coverage && pnpm build && pnpm e2e` — всё зелёное.
- [ ] coverage = 100% (entry/bootstrap исключены).
- [ ] Одна метрика «визиты» на 6 поверхностях идентична.
- [ ] В снапшоте за 14 дней ≤ 120 строк `channel_stats`.
- [ ] CR ∈ [0%, 100%] на всех тестовых данных.
- [ ] UTM-покрытие — одно число во всех 9 местах.
- [ ] DOCX и PDF одного snapshotId: SHA-256 идентичен (без zip/pdf timestamps).
- [ ] Lighthouse a11y ≥ 90 на 9+ страницах.
- [ ] Все доки синхронизированы по версии.

### 6.2. UX (Critical если красное)

- [ ] Меню сгруппировано (3 кластера).
- [ ] Все ≥6 пустых состояний имеют тексты и CTA.
- [ ] Stepper-форма гипотезы валидирует на каждом шаге.
- [ ] Deep-link «слабое место → новая гипотеза» работает с предзаполнением.
- [ ] Header-badge источника данных меняет цвет.
- [ ] TOC в превью отчёта подсвечивает активный раздел.
- [ ] Onboarding-карточка показывается один раз.
- [ ] На мобилке (375×812) ни одна таблица не выходит за viewport.
- [ ] /history имеет фильтр + пагинацию + удаление + тэги.
- [ ] /settings разбит на 3 collapse-секции.

### 6.3. Visual (Major если красное)

- [ ] Единая палитра CHANNEL_COLORS используется во всех ECharts.
- [ ] METRIC_COLORS (visits/applications/payments) — везде одинаковые.
- [ ] Светофор: цвет + иконка + текст.
- [ ] Контраст всех бейджей/текстов ≥ 4.5:1.
- [ ] Все числа через `Intl.NumberFormat('ru-RU')` + `tabular-nums`.
- [ ] ECharts: единая тема `'pca'`, y-axis `scale: true`.
- [ ] Иконки lucide-react в навигации.
- [ ] `<Card>` единый компонент на 9 страницах.
- [ ] DOCX и PDF отчёт по ГОСТ Р 7.32-2017.
- [ ] После каждого графика в отчёте — блок «🟢 хорошо / 🔴 плохо».

### 6.4. Usability (для финального вердикта)

- [ ] Time-to-first-hypothesis (новый волонтёр) ≤ 10 минут.
- [ ] Кликов от Overview до созданной гипотезы ≤ 3.
- [ ] Кликов от снапшота до экспортированного PDF ≤ 4.
- [ ] Survey команды: понимание KPI ≥ 4/5.

---

## 7. Roadmap (финальный)

| Релиз             | Фичи                                                                         | Срок     | Базовый промт        |
| ----------------- | ---------------------------------------------------------------------------- | -------- | -------------------- |
| **v2.3.1** hotfix | §1.1 Blocker-фиксы                                                           | 1 день   | fix-prompt-v2.3.0 §1 |
| **v2.4.0**        | §1 целиком (factsource, дедуп, primary-goal, мини-DS, WCAG basics, doc-sync) | 1 неделя | этот §1              |
| **v2.5.0**        | §2 (страницы методологии, ГОСТ-отчёт, deep-links, onboarding)                | 1 неделя | этот §2              |
| **v2.6.0**        | §3 (полная DS, графики, /report/history/settings, mobile) + §4 adoption      | 1 неделя | этот §3, §4          |
| **v3.0.0**        | §5 (новые графики, what-if, digest, шаблоны, Slack-bot)                      | 2 недели | этот §5              |

После каждого релиза — QA-прогон по всем четырём промтам в `qa/`:

1. `regression-test-prompt.md` — техника.
2. `ux-analyst-prompt.md` — задачи ЦА.
3. `ux-designer-prompt.md` — IA и потоки.
4. `ux-visual-designer-prompt.md` — визуал и a11y.

И обновление `qa/qa-report-v{version}.md` + `qa/fix-prompt-v{next-version}.md`.

---

## 8. Чек-лист для финального вердикта v3.0.0 (= релиз для команды ProductCamp)

Релиз считается готовым к использованию реальной командой только если выполнены **все**
пункты §6.1–6.4. Если хотя бы один красный — продолжать итерации.

Параллельно — **пилот с 3 пользователями** (Лиза + 2 волонтёра):

- За 1 неделю каждый создал ≥3 гипотезы.
- ≥1 цикл «гипотеза → проверка → решение» завершён.
- Отчёт DOCX/PDF показан стейкхолдерам, замечания зафиксированы.
- Survey: «продукт помог достичь 300 платных» — обоснованный ответ.

🟢 GO для прода — если все выше зелёные.

---

## 9. Файлы в `qa/` после этого прогона

- `qa-report-v2.3.0.md` — формальный QA-отчёт.
- `ux-analysis-v2.3.0.md` — UX-аналитик (задачи ЦА).
- `ux-designer-analysis-v2.3.0.md` — UX-проектировщик (IA, формы, состояния).
- `ux-visual-designer-analysis-v2.3.0.md` — визуальный дизайнер (палитра, графики, WCAG).
- `fix-prompt-v2.3.0.md` — баги + ГОСТ + новые страницы.
- `fix-prompt-v2.4.0.md` — IA + формы + состояния.
- `fix-prompt-v2.5.0.md` — **этот файл**, финальный консолидированный план.
- `regression-test-prompt.md`, `ux-analyst-prompt.md`, `ux-designer-prompt.md`, `ux-visual-designer-prompt.md` — обновлённые промты для следующих прогонов.

---

> «Лучший дашборд — тот, после которого команда знает, что делать дальше.»
