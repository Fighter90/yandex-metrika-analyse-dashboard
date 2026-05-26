/** Справка — подробное руководство по дашборду ProductCamp. */
export function Help(): JSX.Element {
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Справка по дашборду</h1>
        <p className="mt-2 text-slate-600">
          Подробное руководство по использованию аналитического дашборда ProductCamp. Здесь описаны
          все страницы, графики, фильтры и рекомендации по работе с данными.
        </p>
      </div>

      {/* Overview */}
      <Section title="Обзор" icon="📊">
        <p className="text-sm text-slate-600">
          Главная страница дашборда. Здесь вы видите общую картину: KPI-цель в 300 платных билетов,
          количество заявок B2C из Яндекс.Метрики и gap до цели.
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          <li>
            <b>KPI-стрип:</b> цель, заявки, gap. Заявка ≠ оплата — заявки B2C это достижения цели
            в Метрике, а не оплаты.
          </li>
          <li>
            <b>Визиты и заявки по дням:</b> линейный график динамики за выбранный период.
          </li>
          <li>
            <b>Микс каналов:</b> круговая диаграмма распределения трафика по каналам (Direct,
            Search, Social и др.).
          </li>
          <li>
            <b>Топ стран:</b> горизонтальная бар-чарт по гео.
          </li>
          <li>
            <b>Доля устройств:</b> donut-чарт смартфоны vs ПК.
          </li>
          <li>
            <b>UTM-разбивка:</b> таблица с CR по каждой кампании.
          </li>
          <li>
            <b>Страницы входа/выхода:</b> топ-5 с bounce rate и конверсией.
          </li>
        </ul>
        <p className="mt-2 text-sm text-slate-600">
          <b>Что смотреть:</b> Если общий CR ниже 1% — проверьте качество трафика. Если bounce rate
          на главной &gt; 25% — упростите первый экран.
        </p>
      </Section>

      {/* Traffic */}
      <Section title="Трафик" icon="🔗">
        <p className="text-sm text-slate-600">
          Детальный анализ каналов трафика. Показывает, какие источники приносят заявки, а какие —
          пустые визиты.
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          <li>
            <b>Каналы — визиты:</b> бар-чарт объёма по каналам.
          </li>
          <li>
            <b>Визиты vs заявки:</b> grouped bar — какой канал лучше конвертирует.
          </li>
          <li>
            <b>Таблица каналов:</b> визиты, пользователи, заявки, CR.
          </li>
          <li>
            <b>UTM-разбивка:</b> детальная таблица по source/medium/campaign.
          </li>
        </ul>
        <p className="mt-2 text-sm text-slate-600">
          <b>Что смотреть:</b> Каналы с CR выше среднего — масштабировать. Каналы с CR ниже 0.5% и
          большим объёмом — проверить качество.
        </p>
      </Section>

      {/* Behavior */}
      <Section title="Поведение" icon="📄">
        <p className="text-sm text-slate-600">
          Анализ посадочных страниц: куда приходят пользователи, откуда уходят, где высокий bounce.
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          <li>
            <b>Конверсия страниц входа:</b> горизонтальный бар-чарт с цветовой индикацией (зелёный
            = хорошо, красный = плохо).
          </li>
          <li>
            <b>Отказы страниц входа:</b> какие страницы теряют больше всего пользователей.
          </li>
          <li>
            <b>Таблица страниц входа:</b> визиты, отказы, заявки, CR с подсветкой.
          </li>
          <li>
            <b>Таблица страниц выхода:</b> точки отвала в воронке.
          </li>
        </ul>
        <p className="mt-2 text-sm text-slate-600">
          <b>Что смотреть:</b> Страницы с bounce &gt; 40% — упростить контент. Страницы с высоким
          трафиком и низким CR — добавить CTA.
        </p>
      </Section>

      {/* Funnel */}
      <Section title="Воронка" icon="🔻">
        <p className="text-sm text-slate-600">
          Воронка конверсии: Визиты → Заявки B2C → B2B pipeline → Оплачено B2B. Показывает, где
          происходят потери.
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          <li>
            <b>Воронка:</b> визуализация этапов с процентами конверсии.
          </li>
          <li>
            <b>Каналы по CR:</b> какой канал лучше проходит воронку.
          </li>
          <li>
            <b>B2B сделки:</b> таблица сделок по этапам (lead → negotiation → invoiced → paid).
          </li>
        </ul>
        <p className="mt-2 text-sm text-slate-600">
          <b>Что смотреть:</b> Если переход заявка → оплата близок к 0% — настроить follow-up
          (авто-письмо + звонок менеджера).
        </p>
      </Section>

      {/* Goals */}
      <Section title="Цели" icon="🎯">
        <p className="text-sm text-slate-600">
          Прогресс к цели в 300 платных билетов. Прогресс-ринг, B2B сделки, рекомендации.
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          <li>
            <b>Прогресс-ринг:</b> визуализация текущего прогресса (B2B оплачено + оценка B2C).
          </li>
          <li>
            <b>Метрики:</b> визиты, общий CR, B2B сделки, процент прогресса.
          </li>
          <li>
            <b>B2B сделки:</b> таблица всех сделок с этапами и суммами.
          </li>
          <li>
            <b>Рекомендации:</b> конкретные действия на основе текущих данных.
          </li>
        </ul>
        <p className="mt-2 text-sm text-slate-600">
          <b>Как считается прогресс:</b> B2B оплачено (из ручного пайплайна) + ~30% от заявок B2C
          (оценка конверсии заявка→оплата).
        </p>
      </Section>

      {/* Report */}
      <Section title="Отчёт" icon="📋">
        <p className="text-sm text-slate-600">
          Генерация детального отчёта с AI-анализом. Экспорт в DOCX и PDF.
        </p>
        <ol className="mt-2 list-inside list-decimal text-sm text-slate-600">
          <li>Выберите период в шапке дашборда.</li>
          <li>Нажмите <b>«Сформировать срез данных»</b>.</li>
          <li>Нажмите <b>«Сгенерировать AI-анализ»</b> (нужен ANTHROPIC_API_KEY).</li>
          <li>Нажмите <b>«Перестроить отчёт»</b> для обновления с текущими фильтрами.</li>
          <li>Экспортируйте в DOCX или PDF.</li>
        </ol>
        <p className="mt-2 text-sm text-slate-600">
          <b>Что входит в отчёт:</b> Краткие итоги, методология, каналы, UTM, гео, страницы,
          воронка, B2B, риски, рекомендации, AI-анализ (5 секций), гипотезы, дорожная карта,
          приложение с данными.
        </p>
      </Section>

      {/* History */}
      <Section title="История" icon="📅">
        <p className="text-sm text-slate-600">
          Список всех сгенерированных отчётов. Кнопка <b>«Просмотреть»</b> открывает сохранённый
          отчёт без перегенерации.
        </p>
      </Section>

      {/* Settings */}
      <Section title="Настройки" icon="⚙️">
        <p className="text-sm text-slate-600">
          Подключение к Яндекс.Метрике и настройка AI-анализа.
        </p>
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          <li>
            <b>OAuth-токен:</b> токен с правом metrika:read.
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
          <li>
            <b>🔄 Обновить данные из Метрики:</b> синхронизация последних 14 дней с прогресс-баром.
          </li>
        </ul>
      </Section>

      {/* Filters */}
      <Section title="Фильтры (шапка)" icon="🔍">
        <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
          <li>
            <b>7д / 14д / 30д:</b> быстрые пресеты периода.
          </li>
          <li>
            <b>📅 Выбрать даты:</b> кастомный период — введите дату начала и дату окончания.
          </li>
          <li>
            <b>Сегмент (B2C / B2C+B2B / B2B):</b>
            <ul className="ml-4 mt-1 list-inside list-disc">
              <li>
                <b>B2C:</b> только потребительские каналы (Direct, Search, Social и др.).
              </li>
              <li>
                <b>B2C+B2B:</b> все каналы (по умолчанию).
              </li>
              <li>
                <b>B2B:</b> только B2B-каналы (если настроены отдельно).
              </li>
            </ul>
          </li>
          <li>
            <b>Архивные цели:</b> показать/скрыть цели Метрики, которые были удалены или
            заархивированы. По умолчанию — только активные цели.
          </li>
          <li>
            <b>🔄 Перестроить отчёт:</b> перестроить текущий срез данных на странице «Отчёт» с
            выбранными фильтрами.
          </li>
        </ul>
      </Section>

      {/* FAQ */}
      <Section title="Частые вопросы" icon="❓">
        <div className="space-y-3 text-sm text-slate-600">
          <div>
            <p className="font-medium text-slate-800">Почему заявка ≠ оплата?</p>
            <p>
              Заявки B2C — это достижения цели в Яндекс.Метрике (например, отправка формы). Оплаты —
              это фактически оплаченные билеты. Не каждая заявка превращается в оплату, поэтому в
              отчёте они разделены.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-800">Как добавить B2B сделку?</p>
            <p>
              Через API <code>POST /api/b2b</code> или напрямую в базу данных SQLite (таблица
              <code>b2b_manual</code>). Этапы: lead → negotiation → invoiced → paid.
            </p>
          </div>
          <div>
            <p className="font-medium text-slate-800">Почему AI-анализ занимает 30-60 секунд?</p>
            <p>
              AI-анализ делает 5 запросов к Anthropic Claude, каждый генерирует отдельную секцию
              отчёта. Это даёт более детальный и структурированный результат, чем один запрос.
            </p>
          </div>
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
