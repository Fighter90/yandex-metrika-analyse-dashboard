/**
 * Deterministic report content derived purely from a {@link ReportSnapshot}. DOCX, PDF and the
 * on-screen preview all render from this single source — so the report is reproducible (no
 * Date.now, no live data, no LLM in the render path) and identical across formats.
 *
 * The output is intentionally verbose: every hypothesis is rendered in full (hypothesis statement,
 * all hidden assumptions by category, every validation method, the ICE breakdown with each
 * rationale, the traffic-light thresholds, deadline and status), plus a prioritization section and
 * an expanded Decision Log. With a populated dataset this yields a detailed multi-page document.
 */
import type { Hypothesis } from './types/hypotheses';
import type { Decision } from './types/decisions';
import type { ReportSnapshot } from './types/report';
import { iceBucket } from './validation';
import {
  BUCKET_LABEL,
  CATEGORY_LABEL,
  KIND_LABEL,
  METHOD_LABEL,
  STATUS_LABEL,
  channelLine,
  channelTotals,
  geoLine,
  pageLine,
  pct,
  priorityLine,
  utmLine,
  hypothesisStatement,
  aiHypothesisSections,
} from './report-section-helpers';

export interface ReportSection {
  readonly heading: string;
  readonly lines: string[];
}

/** A full per-hypothesis section: every hypothesis field spelled out for the report reader. */
function hypothesisDetail(h: Hypothesis, ordinal: number): ReportSection {
  const phase = h.diamondPhase === 'define' ? 'Define (проблема)' : 'Develop (решение)';
  const lines: string[] = [
    `Формулировка: ${hypothesisStatement(h)}`,
    `Тип: ${KIND_LABEL[h.kind]} · фаза Double Diamond: ${phase} · статус: ${STATUS_LABEL[h.status]}`,
  ];
  if (h.description) lines.push(`Описание: ${h.description}`);

  lines.push(
    '',
    `Приоритет ICE = I × C × E = ${h.impact} × ${h.confidence} × ${h.ease} = ${h.iceScore} (${BUCKET_LABEL[iceBucket(h.iceScore)]})`,
    `  • Impact ${h.impact}/10 — ${h.impactRationale}`,
    `  • Confidence ${h.confidence}/10 — ${h.confidenceRationale}`,
    `  • Ease ${h.ease}/10 — ${h.easeRationale}`,
  );

  lines.push('', `Скрытые допущения (${h.hiddenAssumptions.length}):`);
  if (h.hiddenAssumptions.length === 0) {
    lines.push('  — не зафиксированы');
  } else {
    for (const a of h.hiddenAssumptions) {
      lines.push(`  • [${CATEGORY_LABEL[a.category]}] ${a.text}`);
    }
  }

  lines.push('', `Методы проверки (${h.validationMethods.length}):`);
  if (h.validationMethods.length === 0) {
    lines.push('  — не зафиксированы');
  } else {
    for (const m of h.validationMethods) {
      const cost = m.cost ? ` (стоимость: ${m.cost})` : '';
      lines.push(`  • ${METHOD_LABEL[m.type]}: ${m.plan}${cost}`);
    }
  }

  lines.push(
    '',
    'Светофор критериев (порог решения):',
    `  🟢 Зелёный — ${h.greenCriteria}`,
    `  🟡 Жёлтый — ${h.yellowCriteria}`,
    `  🔴 Красный — ${h.redCriteria}`,
    `Дедлайн проверки: ${h.deadlineDays} дн. (до ${h.deadlineAt})`,
  );

  if (h.evidence && h.evidence.length > 0) {
    lines.push('', 'Данные-основания (прослеживаемость до raw_responses):');
    for (const e of h.evidence) {
      const ref = e.rawResponseId !== undefined ? ` [raw_response_id ${e.rawResponseId}]` : '';
      const slice = e.slice ? ` · срез: ${e.slice}` : '';
      const note = e.note ? ` — ${e.note}` : '';
      lines.push(`  • ${e.type}${ref}${slice}${note}`);
    }
  }

  return { heading: `${ordinal}. ${h.title}`, lines };
}

/** An expanded Decision Log entry: findings, evidence quotes, rationale and next step. */
function decisionDetail(d: Decision): ReportSection {
  const lines: string[] = [
    `Гипотеза #${d.hypothesisId} · метод: ${d.method} · период: ${d.periodDays} дн. · решение: ${d.outcome.toUpperCase()}`,
    `Охват проверки: ${d.scope}`,
    `Обоснование вывода: ${d.outcomeRationale}`,
  ];
  lines.push('', `Находки (${d.findings.length}):`);
  if (d.findings.length === 0) {
    lines.push('  — не зафиксированы');
  } else {
    for (const f of d.findings) lines.push(`  • [уверенность: ${f.confidence}] ${f.text}`);
  }
  lines.push('', `Доказательства (${d.evidence.length}):`);
  for (const e of d.evidence) {
    const ref = e.rawResponseId !== undefined ? ` [raw_response_id ${e.rawResponseId}]` : '';
    lines.push(`  • «${e.quote}» — ${e.source}${ref}`);
  }
  lines.push('', `Следующий шаг: ${d.nextStep}`);
  if (d.responsible) lines.push(`Ответственный: ${d.responsible}`);
  if (d.nextDeadline) lines.push(`Дедлайн следующего шага: ${d.nextDeadline}`);
  lines.push(
    `Решение принял: ${d.decidedBy}${d.participants ? ` · участники: ${d.participants}` : ''}`,
  );
  return { heading: `${d.number} — итог проверки`, lines };
}

/**
 * Build the full ordered section list for a snapshot. Each entry becomes an H1 + paragraphs in
 * DOCX/HTML and an accordion block on screen — so a populated snapshot renders as a long,
 * detailed report (cover → summary → methodology → prioritization → every hypothesis in full →
 * decision log → AI analysis → breakdowns → data appendix).
 */
export function reportSections(s: ReportSnapshot): ReportSection[] {
  const problems = s.hypotheses.problems;
  const solutions = s.hypotheses.solutions;
  const allByPriority = [...problems, ...solutions].sort(
    (a, b) => b.iceScore - a.iceScore || a.id - b.id,
  );
  const totalVisits = s.channels.reduce((acc, c) => acc + c.visits, 0);

  const sections: ReportSection[] = [
    {
      heading: 'ProductCamp · Конверсии и лидген',
      lines: [
        `Период: ${s.period.from} — ${s.period.to}`,
        `Снапшот: ${s.id} · сформирован ${s.generatedAt}`,
        `KPI: цель ${s.kpi.target} оплаченных билетов`,
        'Отчёт детерминированный: один snapshotId → идентичный контент в DOCX, PDF и на экране.',
        'Каждая цифра прослеживается до raw_responses в SQLite (anti-hallucination).',
      ],
    },
    {
      heading: 'Executive Summary',
      lines: [
        `Заявки B2C (goal reaches за период): ${s.kpi.b2cApplications}`,
        `Оплачено B2B (билетов): ${s.kpi.b2bPaidTickets}`,
        `Gap до цели (по оплатам): ${s.kpi.gap}`,
        `Суммарно визитов в выборке каналов: ${totalVisits}`,
        '',
        'Главный разрыв: заявка ≠ оплата. Формальные цели Метрики (заявки) и фактические оплаты',
        'разведены везде в отчёте и не суммируются. Цель отчёта — показать, какой трафик приносит',
        'реальные оплаты, и приоритизировать гипотезы роста по методологии проверки гипотез.',
        '',
        `Гипотез в работе: ${problems.length} проблемных + ${solutions.length} решенческих.`,
        `Закрытых проверок (Decision Log): ${s.decisions.length}.`,
      ],
    },
    {
      heading: 'Методология',
      lines: [
        'Цикл Double Diamond: Define (проблемные гипотезы) → Develop (решенческие гипотезы) →',
        'Deliver (Decision Log с проверяемым исходом).',
        '',
        'Формат гипотезы: «{ЦА} {действие} {решение}, если {условие}». Каждая гипотеза',
        'обязана иметь ≥3 скрытых допущения (поведение/рынок/технологии), ≥2 метода проверки,',
        'светофор-критерии 🟢/🟡/🔴 с порогами и дедлайн.',
        '',
        'Приоритизация ICE = Impact × Confidence × Ease (произведение, не среднее), шкала 1–1000.',
        'Произведение наказывает однобокие гипотезы (см. ADR-005). Каждый параметр требует',
        'обоснования. Бакеты: ≤125 низкий, ≤342 средний, ≤729 высокий, выше — топ-приоритет.',
        '',
        'Анти-галлюцинация: ни одной цифры без следа в raw_responses; в render-пути нет LLM и',
        'Date.now(); AI-нарратив (если есть) сгенерирован один раз и сохранён в снапшоте.',
      ],
    },
    {
      heading: 'Воронка: визит → заявка → оплата',
      lines: [
        `1) Визиты (сумма по каналам за период): ${totalVisits}`,
        `2) Заявки B2C (goal reaches): ${s.kpi.b2cApplications} — конверсия визит→заявка ${pct(
          s.kpi.b2cApplications,
          totalVisits,
        )}`,
        `3) Оплачено B2B (билетов): ${s.kpi.b2bPaidTickets}`,
        `Gap до цели в ${s.kpi.target} оплаченных билетов: ${s.kpi.gap}`,
        '',
        'Заявка ≠ оплата: шаги воронки не суммируются — это разные метрики из разных источников',
        '(заявки — из целей Метрики, оплаты B2B — из ручного пайплайна). Цель — двигать именно',
        'оплаты, поэтому Gap считается по оплаченным билетам, а не по заявкам.',
      ],
    },
    {
      heading: 'Анализ по каналам',
      lines:
        channelTotals(s.channels).length === 0
          ? ['Нет данных по каналам за период.']
          : [
              'Каналы за период, отсортированы по визитам. CR = заявки / визиты:',
              '',
              ...channelTotals(s.channels).map(
                (t, i) =>
                  `${i + 1}. ${t.channel}: визитов ${t.visits}, заявок ${t.goalReaches} (CR ${pct(
                    t.goalReaches,
                    t.visits,
                  )})`,
              ),
              '',
              'Каналы с высоким CR в заявку — кандидаты на усиление бюджета; с высоким объёмом, но',
              'низким CR — кандидаты на проверку качества трафика и пути к оплате.',
            ],
    },
    {
      heading: 'Приоритизация гипотез (по ICE)',
      lines:
        allByPriority.length === 0
          ? ['Гипотезы ещё не заведены — приоритизировать нечего.']
          : [
              'Все гипотезы, отсортированы по убыванию ICE. Сверху — то, что бьём первым:',
              '',
              ...allByPriority.map((h, i) => priorityLine(h, i + 1)),
            ],
    },
    {
      heading: 'Define — проблемные гипотезы (обзор)',
      lines:
        problems.length === 0
          ? ['Проблемные гипотезы ещё не заведены.']
          : [
              `Заведено ${problems.length} проблемных гипотез. Полная карточка каждой — ниже.`,
              ...problems.map((h, i) => `  ${i + 1}) ${h.title} [ICE ${h.iceScore}]`),
            ],
    },
    ...problems.map((h, i) => hypothesisDetail(h, i + 1)),
    {
      heading: 'Develop — решенческие гипотезы (обзор)',
      lines:
        solutions.length === 0
          ? ['Решенческие гипотезы ещё не заведены.']
          : [
              `Заведено ${solutions.length} решенческих гипотез. Полная карточка каждой — ниже.`,
              ...solutions.map((h, i) => `  ${i + 1}) ${h.title} [ICE ${h.iceScore}]`),
            ],
    },
    ...solutions.map((h, i) => hypothesisDetail(h, problems.length + i + 1)),
    ...aiHypothesisSections(s.generatedHypotheses),
    {
      heading: 'Deliver — Decision Log (обзор)',
      lines:
        s.decisions.length === 0
          ? ['Завершённых проверок пока нет.']
          : [`Зафиксировано ${s.decisions.length} решений. Детали каждого — ниже.`],
    },
    ...s.decisions.map(decisionDetail),
  ];

  if (s.aiNarrative) {
    sections.push({
      heading: 'AI-анализ (интерпретация, проверяйте по данным)',
      lines: s.aiNarrative.split('\n').filter((l) => l.trim() !== ''),
    });
  }

  sections.push(
    {
      heading: 'Топ источников UTM',
      lines: s.breakdowns.utm.length
        ? s.breakdowns.utm.map(utmLine)
        : ['Нет данных UTM за период.'],
    },
    {
      heading: 'Топ гео + устройства',
      lines: s.breakdowns.geoDevice.length
        ? s.breakdowns.geoDevice.map(geoLine)
        : ['Нет данных гео/устройств за период.'],
    },
    {
      heading: 'Топ страниц входа',
      lines: s.breakdowns.entryPages.length
        ? s.breakdowns.entryPages.map(pageLine)
        : ['Нет данных по страницам входа за период.'],
    },
    {
      heading: 'Топ страниц выхода',
      lines: s.breakdowns.exitPages.length
        ? s.breakdowns.exitPages.map(pageLine)
        : ['Нет данных по страницам выхода за период.'],
    },
    {
      heading: 'Дорожная карта: что делаем дальше',
      lines:
        allByPriority.length === 0
          ? ['Гипотезы не заведены — дорожной карты пока нет.']
          : [
              'Топ-приоритеты по ICE и целевой результат (порог 🟢) каждой гипотезы:',
              '',
              ...allByPriority
                .slice(0, 3)
                .map(
                  (h, i) =>
                    `${i + 1}. [ICE ${h.iceScore}] ${h.title} → цель: ${h.greenCriteria} (дедлайн ${h.deadlineDays} дн.)`,
                ),
              '',
              'Порядок работы: бьём сверху вниз, после каждой проверки фиксируем исход в Decision Log',
              'и обновляем приоритеты — список пересобирается по факту, а не по интуиции.',
            ],
    },
    {
      heading: 'Глоссарий и принципы',
      lines: [
        'Заявка — достижение цели Метрики (например, отправка формы). Не равна оплате.',
        'Оплата (B2B) — фактически оплаченный билет из ручного пайплайна (b2b_manual).',
        'CR (conversion rate) — доля визитов, дошедших до цели (заявки/визиты).',
        'Bounce rate — доля визитов с отказом (один экран, без действия).',
        'ICE — Impact × Confidence × Ease (произведение, 1–1000) — балл приоритета гипотезы.',
        'Double Diamond — Define (проблемы) → Develop (решения) → Deliver (решения зафиксированы).',
        'Светофор 🟢/🟡/🔴 — пороги исхода проверки гипотезы с конкретной метрикой.',
        'raw_responses — таблица сырых ответов Метрики в SQLite; источник правды для всех цифр.',
        'snapshotId — идентификатор неизменяемого снапшота; гарантирует идентичность DOCX/PDF/экрана.',
      ],
    },
    {
      heading: 'Data Appendix',
      lines: [
        `Каналов в выборке: ${s.channels.length}`,
        ...s.channels.map(channelLine),
        '',
        'Прослеживаемость: каждая строка восстановима из raw_responses по (query_hash, date_from, date_to).',
      ],
    },
  );

  return sections;
}
