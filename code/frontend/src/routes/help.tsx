/** Справка — подробное руководство по дашборду ProductCamp (развёрнутая версия). */
export function Help(): JSX.Element {
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Справка по дашборду ProductCamp</h1>
        <p className="mt-2 text-slate-600">
          Полное руководство по использованию аналитического дашборда ProductCamp для трека
          «Конверсии и лидген». Здесь подробно описаны все страницы, графики, фильтры, кнопки,
          данные из Яндекс.Метрики и рекомендации по работе.
        </p>
      </div>

      {/* How the dashboard works */}
      <Section title="Как работает дашборд" icon="🏗️">
        <p className="text-sm text-slate-600">
          Дашборд подключается к <b>Яндекс.Метрике</b> по OAuth, загружает данные через Stat API и
          сохраняет их в локальную базу данных <b>SQLite</b>. Все графики и отчёты строятся на
          основе этих данных.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            <b>Поток данных:</b>
          </p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              Авторизация через OAuth (токен сохраняется в <code>.env</code>).
            </li>
            <li>Синхронизация данных из Метрики за выбранный период (кнопка «Обновить данные»).</li>
            <li>Данные сохраняются в SQLite: каналы, UTM, гео, страницы, цели.</li>
            <li>Дашборд читает данные из SQLite и отображает графики.</li>
            <li>
              Отчёты генерируются из среза данных (snapshot) — неизменяемого снимка на момент
              создания.
            </li>
          </ol>
        </div>
      </Section>

      {/* Filters bar */}
      <Section title="Панель фильтров (шапка)" icon="🔍">
        <p className="text-sm text-slate-600">
          Панель фильтров находится вверху каждой страницы и влияет на все графики и данные.
          Изменение фильтров автоматически обновляет данные на текущей странице.
        </p>
        <div className="mt-3 space-y-3 text-sm text-slate-600">
          <div>
            <p className="font-medium">
              📅 Пресеты периода: <b>7д</b> / <b>14д</b> / <b>30д</b>
            </p>
            <p>
              Быстрый выбор периода: последние 7, 14 или 30 дней. При нажатии данные на странице
              автоматически перезагружаются за новый период.
            </p>
          </div>
          <div>
            <p className="font-medium">📅 Выбрать даты (кастомный период)</p>
            <p>
              Нажмите кнопку «Даты» → введите дату начала и дату окончания → «Применить». Это
              позволяет выбрать произвольный период, например, с 1 по 15 мая.
            </p>
          </div>
          <div>
            <p className="font-medium">
              Сегмент: <b>B2C</b> / <b>B2C+B2B</b> / <b>B2B</b>
            </p>
            <ul className="ml-4 list-inside list-disc space-y-1">
              <li>
                <b>B2C:</b> только потребительские каналы (Direct, Search, Social, Mailing и др.).
                Используйте для анализа B2C-воронки.
              </li>
              <li>
                <b>B2C+B2B:</b> все каналы (по умолчанию). Используйте для общей картины.
              </li>
              <li>
                <b>B2B:</b> только B2B-каналы (если настроены отдельно). Используйте для анализа
                корпоративных продаж.
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium">☑️ Архивные цели</p>
            <p>
              Показывает цели Метрики, которые были удалены или заархивированы. По умолчанию —
              только активные цели. Включите, если хотите видеть исторические цели, которые больше
              не отслеживаются в Метрике.
            </p>
          </div>
        </div>
      </Section>

      {/* Overview page */}
      <Section title="Обзор" icon="📊">
        <p className="text-sm text-slate-600">
          Главная страница дашборда. Здесь вы видите общую картину: KPI-цель в 300 платных билетов,
          количество заявок B2C из Яндекс.Метрики и gap до цели.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Данные на странице:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>KPI-стрип:</b> цель (300), заявки B2C, gap. Данные из Метрики: цель определяется
              автоматически по количеству достижений.
            </li>
            <li>
              <b>Визиты и заявки по дням:</b> линейный график динамики за выбранный период. Данные:{' '}
              <code>ym:s:visits</code> и <code>ym:s:goalReaches</code>.
            </li>
            <li>
              <b>Заявки по дням:</b> отдельный график только заявок.
            </li>
            <li>
              <b>Микс каналов:</b> круговая диаграмма распределения трафика. Каналы: Direct, Search,
              Internal, Link, Social, Mailing, Messenger, Ad, Recommendation.
            </li>
            <li>
              <b>Топ стран:</b> горизонтальный бар-чарт по гео (Россия, Нидерланды, США и др.).
            </li>
            <li>
              <b>Доля устройств:</b> donut-чарт: смартфоны, ПК, планшеты.
            </li>
            <li>
              <b>UTM-разбивка:</b> таблица с source/medium/campaign, визиты, заявки, CR.
            </li>
            <li>
              <b>Страницы входа:</b> топ-5 страниц, с которых приходят пользователи.
            </li>
            <li>
              <b>Страницы выхода:</b> топ-5 страниц, с которых уходят пользователи.
            </li>
            <li>
              <b>Слабые места:</b> каналы с CR ниже среднего.
            </li>
          </ul>
          <p className="font-medium mt-2">Цветовая индикация:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              🟢 <b>Зелёный:</b> CR выше 2% — хорошо, масштабировать.
            </li>
            <li>
              🟡 <b>Жёлтый:</b> CR 1–2% — нормально, есть потенциал роста.
            </li>
            <li>
              🔴 <b>Красный:</b> CR ниже 1% — проблема, проверить качество трафика.
            </li>
          </ul>
          <p className="font-medium mt-2">Что делать:</p>
          <p>
            Если общий CR ниже 1% — проверьте качество трафика и посадочные страницы. Если bounce
            rate на главной &gt; 25% — упростите первый экран. Если UTM-покрытие ниже 70% —
            настройте разметку ссылок.
          </p>
        </div>
      </Section>

      {/* Traffic page */}
      <Section title="Трафик" icon="🔗">
        <p className="text-sm text-slate-600">
          Детальный анализ каналов трафика. Показывает, какие источники приносят заявки, а какие —
          пустые визиты.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Графики:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>Каналы — визиты:</b> бар-чарт объёма по каждому каналу.
            </li>
            <li>
              <b>Визиты vs заявки:</b> grouped bar — сравнение объёма и конверсии.
            </li>
          </ul>
          <p className="font-medium mt-2">Таблицы:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>Каналы:</b> визиты, пользователи, заявки, CR.
            </li>
            <li>
              <b>UTM-разбивка:</b> детальная таблица по source/medium/campaign.
            </li>
          </ul>
          <p className="font-medium mt-2">Каналы из Метрики:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>Direct traffic:</b> прямые заходы (URL из адресной строки, закладки).
            </li>
            <li>
              <b>Search engine traffic:</b> переходы из поисковых систем (Яндекс, Google).
            </li>
            <li>
              <b>Internal traffic:</b> внутренние переходы внутри сайта.
            </li>
            <li>
              <b>Link traffic:</b> переходы по внешним ссылкам.
            </li>
            <li>
              <b>Social networks traffic:</b> из соцсетей (VK, Telegram и др.).
            </li>
            <li>
              <b>Mailing traffic:</b> из email-рассылок.
            </li>
            <li>
              <b>Messenger traffic:</b> из мессенджеров.
            </li>
            <li>
              <b>Ad traffic:</b> платная реклама.
            </li>
            <li>
              <b>Recommendation systems traffic:</b> из рекомендательных систем.
            </li>
          </ul>
        </div>
      </Section>

      {/* Behavior page */}
      <Section title="Поведение" icon="📄">
        <p className="text-sm text-slate-600">
          Анализ посадочных страниц: куда приходят пользователи, откуда уходят, где высокий bounce.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Графики:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>Конверсия страниц входа:</b> горизонтальный бар-чарт. Цвет: зелёный = CR &gt; 2%,
              красный = CR &lt; 0.5%.
            </li>
            <li>
              <b>Отказы страниц входа:</b> какие страницы теряют больше всего пользователей.
            </li>
            <li>
              <b>Отказы страниц выхода:</b> точки отвала в воронке.
            </li>
          </ul>
          <p className="font-medium mt-2">Таблицы:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>Страницы входа:</b> URL, визиты, отказы, заявки, CR.
            </li>
            <li>
              <b>Страницы выхода:</b> URL, визиты, отказы, заявки, CR.
            </li>
          </ul>
          <p className="font-medium mt-2">Метрики:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>Bounce rate:</b> доля визитов с отказом (один экран, без действия). Норма: &lt;
              30%.
            </li>
            <li>
              <b>CR:</b> conversion rate = заявки / визиты. Норма: &gt; 1%.
            </li>
          </ul>
        </div>
      </Section>

      {/* Funnel page */}
      <Section title="Воронка" icon="🔻">
        <p className="text-sm text-slate-600">
          Воронка конверсии: Визиты → Заявки B2C → B2B pipeline → Оплачено B2B. Показывает, где
          происходят потери.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Этапы воронки:</p>
          <ol className="ml-4 list-inside list-decimal space-y-1">
            <li>
              <b>Визиты:</b> общее количество посещений сайта за период.
            </li>
            <li>
              <b>Заявки B2C:</b> достижения цели в Метрике (отправка формы).
            </li>
            <li>
              <b>B2B pipeline:</b> количество билетов в работе (из ручного пайплайна).
            </li>
            <li>
              <b>Оплачено B2B:</b> фактически оплаченные билеты. Засчитывается в цель 300.
            </li>
          </ol>
          <p className="font-medium mt-2">Анализ потерь:</p>
          <p>
            Показывает, сколько пользователей потеряно на каждом этапе воронки и какой процент от
            предыдущего этапа.
          </p>
          <p className="font-medium mt-2">Рекомендации:</p>
          <p>
            Если переход заявка → оплата близок к 0% — настроить follow-up (авто-письмо + звонок
            менеджера). Если B2B pipeline пуст — запустить активные продажи.
          </p>
        </div>
      </Section>

      {/* Goals page */}
      <Section title="Цели" icon="🎯">
        <p className="text-sm text-slate-600">
          Прогресс к цели в 300 платных билетов. Прогресс-ринг, B2B сделки, рекомендации.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Прогресс-ринг:</p>
          <p>
            Визуализация текущего прогресса. Цвет меняется: красный (&lt; 50%), жёлтый (50–99%),
            зелёный (100%).
          </p>
          <p className="font-medium mt-2">Как считается прогресс:</p>
          <p>
            B2B оплачено (из ручного пайплайна) + ~30% от заявок B2C (оценка конверсии
            заявка→оплата). Это оценка, а не точное число.
          </p>
          <p className="font-medium mt-2">Метрики:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>Визиты за период</li>
            <li>Общий CR (заявки/визиты)</li>
            <li>B2B сделки (количество)</li>
            <li>Процент прогресса к цели</li>
          </ul>
        </div>
      </Section>

      {/* Report page */}
      <Section title="Отчёт" icon="📋">
        <p className="text-sm text-slate-600">
          Генерация детального отчёта с AI-анализом. Экспорт в DOCX и PDF.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Как создать отчёт:</p>
          <ol className="ml-4 list-inside list-decimal space-y-1">
            <li>Выберите период в шапке дашборда.</li>
            <li>
              Нажмите <b>«Сформировать срез данных»</b>.
            </li>
            <li>
              Нажмите <b>«Сгенерировать AI-анализ»</b> (нужен ANTHROPIC_API_KEY).
            </li>
            <li>Подождите 30–60 секунд — AI генерирует 5 секций отчёта.</li>
            <li>
              Нажмите <b>«Перестроить отчёт»</b> для обновления с текущими фильтрами.
            </li>
            <li>Экспортируйте в DOCX или PDF.</li>
          </ol>
          <p className="font-medium mt-2">Что входит в отчёт:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>Краткие итоги (executive summary)</li>
            <li>Методология (Double Diamond + ICE)</li>
            <li>Каналы, UTM, гео, страницы</li>
            <li>Воронка конверсии</li>
            <li>B2B-пайплайн</li>
            <li>Риски и рекомендации</li>
            <li>AI-анализ (5 секций: Итог, Каналы, Страницы, Риски, Гипотезы)</li>
            <li>Гипотезы (проблемные и решенческие)</li>
            <li>Дорожная карта</li>
            <li>Приложение с данными</li>
          </ul>
          <p className="font-medium mt-2">AI-анализ:</p>
          <p>
            Генерируется в 5 секций через Anthropic Claude. Каждая секция — отдельный запрос с
            контекстом данных снапшота. Результат отображается как HTML с форматированием.
          </p>
        </div>
      </Section>

      {/* History page */}
      <Section title="История" icon="📅">
        <p className="text-sm text-slate-600">
          Список всех сгенерированных отчётов. Кнопка <b>«Просмотреть»</b> открывает сохранённый
          отчёт без перегенерации.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Таблица истории:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>ID:</b> уникальный идентификатор снапшота.
            </li>
            <li>
              <b>Сформирован:</b> дата и время создания.
            </li>
            <li>
              <b>Период:</b> даты, за которые собран отчёт.
            </li>
            <li>
              <b>Просмотреть:</b> открывает отчёт на странице «Отчёт».
            </li>
          </ul>
        </div>
      </Section>

      {/* Settings page */}
      <Section title="Настройки" icon="⚙️">
        <p className="text-sm text-slate-600">
          Подключение к Яндекс.Метрике и настройка AI-анализа.
        </p>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p className="font-medium">Текущий счётчик:</p>
          <p>
            Вверху страницы отображается текущий ID счётчика Метрики. Если значение 0 — работает
            демо-режим с seed-данными.
          </p>
          <p className="font-medium mt-2">Поля:</p>
          <ul className="ml-4 list-inside list-disc space-y-1">
            <li>
              <b>OAuth-токен:</b> токен с правом metrika:read. Получить на
              <a
                href="https://oauth.yandex.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 underline ml-1"
              >
                oauth.yandex.ru
              </a>
              .
            </li>
            <li>
              <b>Client ID/Secret:</b> для OAuth-аутентификации.
            </li>
            <li>
              <b>COUNTER_ID:</b> ID счётчика Метрики (54280963 для ProductCamp).
            </li>
            <li>
              <b>GOAL_ID:</b> ID цели KPI (0 = авто-определение).
            </li>
            <li>
              <b>ANTHROPIC_API_KEY:</b> ключ для AI-анализа (можно пропустить).
            </li>
          </ul>
          <p className="font-medium mt-2">Обновить данные из Метрики:</p>
          <p>
            Кнопка запускает синхронизацию данных за последние 14 дней. Прогресс-бар показывает
            текущий этап: подключение → цели → каналы → UTM → гео → страницы → сохранение →
            обновление отчётов.
          </p>
        </div>
      </Section>

      {/* Help page */}
      <Section title="Справка" icon="❓">
        <p className="text-sm text-slate-600">
          Вы находитесь на странице справки. Здесь вы нашли подробное описание всех страниц,
          фильтров, графиков и рекомендаций.
        </p>
      </Section>

      {/* Glossary */}
      <Section title="Глоссарий" icon="📖">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm text-slate-600">
          <div>
            <b>CR (Conversion Rate)</b> — конверсия = заявки / визиты. Выражается в %.
          </div>
          <div>
            <b>Bounce Rate</b> — доля отказов = визиты с одним экраном / все визиты.
          </div>
          <div>
            <b>UTM</b> — метки в URL для отслеживания источников трафика.
          </div>
          <div>
            <b>B2C</b> — бизнес для потребителей (розничные продажи).
          </div>
          <div>
            <b>B2B</b> — бизнес для бизнеса (корпоративные продажи).
          </div>
          <div>
            <b>ICE</b> — Impact × Confidence × Ease, приоритизация гипотез (1–1000).
          </div>
          <div>
            <b>Gap</b> — разрыв между текущим результатом и целью.
          </div>
          <div>
            <b>Snapshot</b> — неизменяемый срез данных на момент создания.
          </div>
          <div>
            <b>Метрика</b> — Яндекс.Метрика, система веб-аналитики.
          </div>
          <div>
            <b>SQLite</b> — локальная база данных для хранения метрик.
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section title="Частые вопросы" icon="❓">
        <div className="space-y-4 text-sm text-slate-600">
          <FAQ question="Почему заявка ≠ оплата?">
            Заявки B2C — это достижения цели в Яндекс.Метрике (например, отправка формы). Оплаты —
            это фактически оплаченные билеты. Не каждая заявка превращается в оплату, поэтому в
            отчёте они разделены.
          </FAQ>
          <FAQ question="Как добавить B2B сделку?">
            Через API <code>POST /api/b2b</code> или напрямую в базу данных SQLite (таблица{' '}
            <code>b2b_manual</code>). Этапы: lead → negotiation → invoiced → paid.
          </FAQ>
          <FAQ question="Почему AI-анализ занимает 30-60 секунд?">
            AI-анализ делает 5 запросов к Anthropic Claude, каждый генерирует отдельную секцию
            отчёта. Это даёт более детальный и структурированный результат, чем один запрос.
          </FAQ>
          <FAQ question="Как изменить период на графиках?">
            Используйте пресеты 7д/14д/30д в шапке или нажмите «Даты» для выбора произвольного
            периода. Данные на странице автоматически перезагрузятся.
          </FAQ>
          <FAQ question="Что означает «архивные цели»?">
            Цели Метрики, которые были удалены или заархивированы. По умолчанию показываются только
            активные цели. Включите чекбокс, чтобы видеть исторические цели.
          </FAQ>
          <FAQ question="Как экспортировать отчёт в PDF?">
            На странице «Отчёт» нажмите кнопку «Export PDF». Если появляется ошибка 500 — убедитесь,
            что установлен Chrome и задан PUPPETEER_EXECUTABLE_PATH в .env.
          </FAQ>
          <FAQ question="Что делать, если данные не обновляются?">
            Проверьте OAuth-токен в настройках. Убедитесь, что COUNTER_ID правильный. Нажмите
            «Обновить данные из Метрики» и дождитесь завершения синхронизации.
          </FAQ>
          <FAQ question="Как работает сегмент B2C/B2B?">
            B2C — только потребительские каналы. B2B — только B2B-каналы. B2C+B2B — все каналы.
            Фильтр влияет на все графики и данные на странице.
          </FAQ>
          <FAQ question="Почему на некоторых страницах нет данных?">
            Данные загружаются из Метрики только после синхронизации. Нажмите «Обновить данные» в
            настройках и выберите период, за который хотите видеть данные.
          </FAQ>
          <FAQ question="Как получить OAuth-токен для Метрики?">
            Перейдите на{' '}
            <a
              href="https://oauth.yandex.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 underline"
            >
              oauth.yandex.ru
            </a>
            , создайте приложение с правом metrika:read, получите токен и вставьте в настройках.
          </FAQ>
        </div>
      </Section>
    </section>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function FAQ({ question, children }: { question: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <p className="font-medium text-slate-800">{question}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
