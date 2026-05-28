# QA — Полный регресс-промпт проекта (v2.9.1)

> Роль: **QA-инженер / AI-агент** с доступом к репозиторию и запущенному приложению.
> Цель — за один прогон проверить **весь** проект и закрыть дефекты полировки AI-DOCX v2.9.1.
> Базовый полный чек-лист — `QA/regression-test-prompt-v2.9.0.md` (API, 9 страниц, фильтры,
> DOCX/PDF, детерминизм, доступность, мобайл, секреты). Здесь — тот же объём + новые проверки v2.9.1.

> 🔄 Актуально для **v2.9.1** (2026-05-29). Текущий релиз — тег `v2.9.1`.

---

## 0. Базовый прогон (из v2.9.0)

Выполнить целиком `QA/regression-test-prompt-v2.9.0.md`:

- Автогейт: `pnpm -r typecheck && pnpm lint && pnpm format:check && node scripts/sync-versions.mjs --check && pnpm -r coverage && pnpm build && pnpm exec playwright test` — всё зелёное (coverage 100%, e2e 28/28).
- API (2), 9 страниц UI (3), фильтры (4), генерация отчёта (5), **глубокая DOCX (6)** и **PDF (7)**,
  AI-анализ (8), детерминизм (9), доступность (10), мобайл (11), безопасность/секреты (12).

---

## 1. 🔬 AI-DOCX чистота (новое в v2.9.1)

Сгенерировать снапшот + AI-анализ, экспортировать DOCX, распаковать:

```bash
SNAP=$(curl -s -X POST localhost:4000/api/report/snapshot -H 'content-type: application/json' \
  -d '{"from":"2026-05-13","to":"2026-05-27"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
# (опц.) сгенерировать AI: нажать «Сгенерировать AI-анализ» в /report или POST /api/report/insights
curl -s -X POST localhost:4000/api/report/generate -H 'content-type: application/json' \
  -d "{\"snapshotId\":\"$SNAP\",\"format\":\"docx\"}" >/dev/null
curl -s "localhost:4000/api/report/download/$SNAP/docx" -o /tmp/r.docx
mkdir -p /tmp/rdocx && (cd /tmp/rdocx && unzip -qo /tmp/r.docx)
DOC=/tmp/rdocx/word/document.xml
```

- [ ] **D-EMOJI:** AI-заголовки не начинаются с эмодзи. Все `w:pStyle="Heading*"` параграфы — без
      ведущего 🔴/✅/🟢/⚠️. (Эмодзи ВНУТРИ абзацев сохраняются как акцент — это норма.)
- [ ] **D-DOUBLE-NUM:** нет двойной нумерации. `grep -oE "[0-9]+\. [0-9]+\." $DOC` → **пусто**
      (не должно быть «11. 1. Где мы сейчас»). AI-заголовки — смысловые, без «1.»/«Шаг 1.»/«Раздел 1.».
- [ ] **D-VERBOSE:** каждая AI-секция ≤ 35 строк; длинные секции обрезаны с пометкой
      «…[раздел сокращён по лимиту объёма; полная версия — в snapshot.aiNarrative]». Общий объём
      AI-DOCX заметно меньше прежнего.
- [ ] **D-EMPTY-PAGE:** на титульной странице **нет прогона из 2+ пустых абзацев**. Отступы заданы
      через `spacing.before`, не через пустые `<w:p/>`. Визуально титул по ГОСТ.
- [ ] **markdown-leak:** `grep -oE "####|<p>|<br" $DOC` → пусто; `**`, `##` в тексте отсутствуют.

---

## 2. KPI-лейбл по goalLabel (m-snapshot-label)

- [ ] При основной цели **e_purchase** KPI-лейбл в превью `/report` = **«Оплат»** (не «Заявки B2C»);
      caveat «заявка ≠ оплата» скрыт.
- [ ] При обычной цели — «Заявок B2C» с caveat. Согласовано с /overview и /goals.

---

## 3. Настройки — детальная проверка сохранения

- [ ] **GOAL_ID — combobox** (m-007): поиск по названию цели, группы «Активные (N)» / «Архивные (N)»,
      выбор сохраняется и триггерит ре-синхронизацию. Не `input number`.
- [ ] **Anthropic API Key — маска** (m-api-key): если ключ задан, под полем видно «Текущий ключ:
      sk-a\*\*\*\*AA»; поле password; пустое значение НЕ перезаписывает ключ.
- [ ] **Сохранение пишет в `.env` правильно:**
  - Изменить GOAL_ID и Client ID, нажать «Сохранить» → проверить `.env`: новые значения записаны,
    **остальные строки и комментарии сохранены**, секреты не затёрты.
  - Оставить токен/секрет/ключ пустыми (маска) → значения в `.env` НЕ меняются.
  - `COUNTER_ID` отправляется только если изменён вручную.
  - Команды проверки (НЕ логировать секреты):
    ```bash
    curl -s localhost:4000/api/settings | python3 -c 'import sys,json;d=json.load(sys.stdin);print({k:("set" if v else v) for k,v in d.items()})'
    grep -cE "^(YANDEX_OAUTH_TOKEN|COUNTER_ID|GOAL_ID|ANTHROPIC_API_KEY)=" .env   # ключи на месте
    ```
- [ ] **«Очистить данные»** обнуляет поля и пишет пустые значения в `.env`.
- [ ] **«🔄 Обновить данные из Метрики»** запускает sync (прогресс-бар, 10 стадий), по завершении
      страницы дашборда обновляются.

---

## 4. C-005 — дедуп URL страниц

- [ ] На /overview «Топ страниц входа» — `https://productcamp.ru/` одной строкой (не дубль с/без
      завершающего слэша).
- [ ] Инвариант БД: `SELECT date, page, COUNT(*) FROM page_stats GROUP BY date, page HAVING COUNT(*)>1`
      — 0 строк после ре-синхронизации.
- [ ] Юнит-тесты `normalize-page.test.ts` зелёные (нормализация + визит-взвешенная агрегация).

---

## 5. M-DET — детерминизм (уточнённое определение)

- [ ] Дважды `generate` одного `snapshotId` → совпадают `word/document.xml` и PNG (по SHA1-именам).
- [ ] Файловый SHA-256 контейнера DOCX/PDF может отличаться (zip/pdf-таймстемпы) — **known limitation**,
      не дефект. См. `docs/anti-hallucination.md` (content-determinism).

---

## 6. Ручные верификации (нужен GUI / живой Anthropic)

- [ ] **offline-docx:** открыть DOCX и PDF в Word/LibreOffice; зафиксировать скриншоты в
      `qa/offline-audit-v2.9.1.md`: поля 30/15/20/20 мм, Times New Roman 14pt, межстрочный 1.5,
      нумерация страниц внизу, TOC с гиперссылками, 3 графика не обрезаны, AI без эмодзи/двойной
      нумерации/пустых прогонов, текст по ширине.
- [ ] **ai-live-validation:** `POST /api/report/insights` → 6 секций (Итог / Каналы-UTM-Аудитория /
      Страницы-Воронка / Риски-Рекомендации / Гипотезы-Дорожная карта / Итоговый вывод);
      `GET /api/report/snapshot/:id` содержит `aiNarrative`; экспорт DOCX — без D-EMOJI/D-DOUBLE-NUM/D-VERBOSE.
- [ ] **a11y / mobile:** axe-core 0 нарушений и отсутствие горизонтального скролла на 9 страницах
      (e2e `mobile-iphone-14` уже в наборе; axe — при наличии axe-плагина, иначе вручную).

---

## 7. Светофор готовности

- 🟢 **GO** — базовый прогон (раздел 0) зелёный; разделы 1–5 пройдены; 0 Blocker/Critical.
- 🟡 **CONDITIONAL** — есть Major, базовые сценарии и отчёты работают.
- 🔴 **NO-GO** — есть Blocker/Critical или красный автогейт.

## 8. Базлайн v2.9.1 (должно быть зелёным)

- ✅ D-EMOJI: 0 эмодзи-заголовков. D-DOUBLE-NUM: 0 двойных нумераций. D-VERBOSE: AI-секции ≤ 35 строк.
  D-EMPTY-PAGE: ≤ 1 пустого абзаца подряд на титуле.
- ✅ m-snapshot-label: KPI-лейбл из `goalLabel`. m-api-key: маска ключа видна. C-005: URL страниц
  дедуплицированы. m-007: GOAL_ID combobox.
- ✅ Настройки сохраняют только переданные ключи в `.env`, сохраняя остальные строки.
- ✅ Автогейт: typecheck / lint / format / sync-versions / coverage 100% / build / e2e 28/28.

> «v2.9.0 — production без AI. v2.9.1 — production с AI без оговорок.»
