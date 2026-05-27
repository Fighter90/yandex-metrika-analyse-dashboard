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
import type { ReportSnapshot, ReportChartId } from './types/report';
import { iceBucket } from './validation';
import { buildReportRecommendations } from './report-recommendations';
import { chartRecommendation, REPORT_CHART_TITLES } from './report-charts';
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
  aiDecisionSections,
} from './report-section-helpers';

export interface ReportSection {
  readonly heading: string;
  readonly lines: string[];
  /** When set and snapshot.charts has this id, renderers embed the chart PNG at the top of the section. */
  readonly chartId?: ReportChartId;
}

/** Per-chart 🟢/🔴 interpretation block (FINAL §6.3), appended below each chart's section. */
function chartBlock(s: ReportSnapshot, id: ReportChartId): string[] {
  const rec = chartRecommendation(s, id);
  return [
    '',
    `Интерпретация диаграммы «${REPORT_CHART_TITLES[id]}» (по порогам, прослеживается до данных):`,
    '🟢 Что хорошо:',
    ...rec.good.map((g) => `  • ${g}`),
    '🔴 Что плохо:',
    ...rec.bad.map((b) => `  • ${b}`),
  ];
}

/** Parse markdown-style chunked AI narrative into report sections.
 * Ensures NO truncation: all text including trailing lines without headings is preserved. */
function parseChunkedNarrative(narrative: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const lines = narrative.split('\n');
  let currentHeading = '';
  const currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^## (.+)$/);
    if (headingMatch && headingMatch[1]) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          lines: currentLines.filter((l) => l.trim() !== ''),
        });
        currentLines.length = 0;
      }
      currentHeading = headingMatch[1];
    } else if (line.startsWith('---')) {
      // Section separator — push current section
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          lines: currentLines.filter((l) => l.trim() !== ''),
        });
        currentHeading = '';
        currentLines.length = 0;
      }
    } else {
      currentLines.push(line);
    }
  }
  // CRITICAL: push any remaining content, even without a heading
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      lines: currentLines.filter((l) => l.trim() !== ''),
    });
  } else if (currentLines.length > 0) {
    // Trailing text without any heading — add as "Итог"
    sections.push({
      heading: 'Результирующий вывод',
      lines: currentLines.filter((l) => l.trim() !== ''),
    });
  }
  return sections;
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

/** B2B summary section. */
function b2bSection(s: ReportSnapshot): ReportSection | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b2b = (s as any).b2bSummary as
    | {
        totalTickets: number;
        paidTickets: number;
        dealsCount: number;
        deals: Array<{ company: string; tickets: number; stage: string }>;
        byStage: Array<{ stage: string; tickets: number; deals: number }>;
      }
    | undefined;

  if (!b2b || b2b.dealsCount === 0) return null;

  const lines: string[] = [
    `Всего B2B билетов: ${b2b.totalTickets}`,
    `Оплачено B2B: ${b2b.paidTickets}`,
    `Активных сделок: ${b2b.dealsCount}`,
    '',
    'Детализация по этапам:',
  ];
  for (const stage of b2b.byStage) {
    lines.push(`  • ${stage.stage}: ${stage.tickets} билетов (${stage.deals} сделок)`);
  }
  if (b2b.deals.length > 0) {
    lines.push('', 'Список сделок:');
    for (const d of b2b.deals) {
      lines.push(`  • ${d.company}: ${d.tickets} билетов [${d.stage}]`);
    }
  }

  return { heading: 'B2B-пайплайн', lines };
}

/** Funnel analysis section. */
function funnelSection(s: ReportSnapshot): ReportSection | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funnel = (s as any).funnel as
    | {
        visits: number;
        b2cApplications: number;
        b2bPipelineTickets: number;
        b2bPaidTickets: number;
      }
    | undefined;

  if (!funnel) return null;

  const visitToAppCR =
    funnel.visits > 0 ? ((funnel.b2cApplications / funnel.visits) * 100).toFixed(1) : '0.0';

  const lines: string[] = [
    `Этап 1: Визиты — ${funnel.visits}`,
    `Этап 2: Заявки B2C — ${funnel.b2cApplications} (CR ${visitToAppCR}%)`,
    `Этап 3: B2B в работе — ${funnel.b2bPipelineTickets} билетов`,
    `Этап 4: Оплачено B2B — ${funnel.b2bPaidTickets} билетов`,
    '',
    `Gap до цели (${s.kpi.target}): ${s.kpi.gap} платных билетов`,
    `Конверсия визит → заявка: ${visitToAppCR}%`,
  ];

  if (funnel.visits > 0 && funnel.b2cApplications > 0) {
    lines.push('');
    lines.push('Анализ воронки:');
    const lostVisits = funnel.visits - funnel.b2cApplications;
    lines.push(
      `  • Потеряно на этапе заявки: ${lostVisits} визитов (${((lostVisits / funnel.visits) * 100).toFixed(1)}%)`,
    );
    if (funnel.b2bPipelineTickets > 0) {
      lines.push(`  • B2B-пайплайн в работе: ${funnel.b2bPipelineTickets} билетов`);
    }
  }

  return { heading: 'Воронка конверсии', lines };
}

/** Detailed channel analysis section. */
function channelAnalysisSection(s: ReportSnapshot): ReportSection {
  const totals = channelTotals(s.channels);
  const totalVisits = totals.reduce((a, t) => a + t.visits, 0);

  const lines: string[] = [
    `Всего каналов: ${totals.length}`,
    `Суммарно визитов: ${totalVisits}`,
    `Суммарно заявок: ${s.kpi.b2cApplications}`,
    '',
    'Детализация по каналам (отсортировано по визитам):',
    '',
  ];

  for (let i = 0; i < totals.length; i++) {
    const t = totals[i];
    if (!t) continue;
    const cr = t.visits > 0 ? ((t.goalReaches / t.visits) * 100).toFixed(1) : '0.0';
    const share = totalVisits > 0 ? ((t.visits / totalVisits) * 100).toFixed(1) : '0.0';
    lines.push(`${i + 1}. ${t.channel}`);
    lines.push(`   Визиты: ${t.visits} (${share}% от общего трафика)`);
    lines.push(`   Заявки: ${t.goalReaches}`);
    lines.push(`   CR: ${cr}%`);
    lines.push('');
  }

  // Highlight top and bottom performers
  if (totals.length > 0) {
    const bestCr = totals.reduce(
      (best, t) => {
        if (!t) return best;
        const cr = t.visits > 0 ? t.goalReaches / t.visits : 0;
        return cr > best.cr ? { channel: t.channel, cr } : best;
      },
      { channel: '', cr: 0 },
    );

    const worstCr = totals.reduce(
      (worst, t) => {
        if (!t || t.visits === 0) return worst;
        const cr = t.goalReaches / t.visits;
        return cr < worst.cr ? { channel: t.channel, cr } : worst;
      },
      { channel: totals[0]?.channel ?? '', cr: 1 },
    );

    lines.push('Выводы:');
    if (bestCr.channel) {
      lines.push(
        `  • Лучший CR: ${bestCr.channel} (${(bestCr.cr * 100).toFixed(1)}%) — масштабировать`,
      );
    }
    if (worstCr.channel && worstCr.cr > 0) {
      lines.push(
        `  • Худший CR: ${worstCr.channel} (${(worstCr.cr * 100).toFixed(1)}%) — проверить качество трафика`,
      );
    }
  }

  lines.push(...chartBlock(s, 'channelBar'));
  return { heading: 'Анализ по каналам (детальный)', lines, chartId: 'channelBar' };
}

/**
 * Build the full ordered section list for a report snapshot. Each entry becomes an H1 + paragraphs in
 * DOCX/HTML and an accordion block on screen — so a populated snapshot renders as a long,
 * detailed report (cover → summary → methodology → prioritization → every hypothesis in full →
 * decision log → AI analysis → breakdowns → data appendix).
 *
 * Empty hypothesis sections are skipped entirely — they only appear when hypotheses exist.
 */
export function reportSections(s: ReportSnapshot): ReportSection[] {
  const problems = s.hypotheses.problems;
  const solutions = s.hypotheses.solutions;
  const allByPriority = [...problems, ...solutions].sort(
    (a, b) => b.iceScore - a.iceScore || a.id - b.id,
  );
  const hasHypotheses = allByPriority.length > 0;
  const hasAiHypotheses =
    (s.generatedHypotheses?.problems.length ?? 0) > 0 ||
    (s.generatedHypotheses?.solutions.length ?? 0) > 0;
  const totalVisits = s.channels.reduce((acc, c) => acc + c.visits, 0);

  const sections: ReportSection[] = [
    {
      heading: 'ProductCamp · Конверсии и лидген',
      lines: [
        `Период: ${s.period.from} — ${s.period.to}`,
        `Срез данных: ${s.id} · сформирован ${s.generatedAt}`,
        `KPI: цель ${s.kpi.target} оплаченных билетов`,
        'Отчёт детерминированный: один ИД среза → идентичный контент в DOCX, PDF и на экране.',
        'Каждая цифра прослеживается до raw_responses в SQLite (анти-галлюцинация).',
      ],
    },
    {
      heading: 'Краткие итоги',
      lines: [
        `${s.goalLabel?.title ?? 'Заявок B2C'} (достижения основной цели за период): ${s.kpi.b2cApplications}`,
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
      heading: 'Рекомендации: что хорошо и что плохо',
      lines: (() => {
        const rec = buildReportRecommendations(s);
        return [
          'Детерминированная оценка по порогам (CR ≥5% / <2%, отказы ≥70%), прослеживается до данных:',
          '',
          '🟢 Что хорошо:',
          ...rec.good.map((g) => `  • ${g}`),
          '',
          '🔴 Что плохо:',
          ...rec.bad.map((b) => `  • ${b}`),
        ];
      })(),
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
        'Date.now(); AI-нарратив (если есть) сгенерирован один раз и сохранён в срезе данных.',
      ],
    },
  ];

  // Funnel section
  const funnelSec = funnelSection(s);
  if (funnelSec) sections.push(funnelSec);

  // B2B section
  const b2bSec = b2bSection(s);
  if (b2bSec) sections.push(b2bSec);

  // Detailed channel analysis
  sections.push(channelAnalysisSection(s));

  sections.push({
    heading: 'Воронка: визит → заявка → оплата',
    chartId: 'funnel',
    lines: [
      `1) Визиты (сумма по каналам за период): ${totalVisits}`,
      `2) Заявки B2C (достижения цели): ${s.kpi.b2cApplications} — конверсия визит→заявка ${pct(
        s.kpi.b2cApplications,
        totalVisits,
      )}`,
      `3) Оплачено B2B (билетов): ${s.kpi.b2bPaidTickets}`,
      `Gap до цели в ${s.kpi.target} оплаченных билетов: ${s.kpi.gap}`,
      '',
      'Заявка ≠ оплата: шаги воронки не суммируются — это разные метрики из разных источников',
      '(заявки — из целей Метрики, оплаты B2B — из ручного пайплайна). Цель — двигать именно',
      'оплаты, поэтому Gap считается по оплаченным билетам, а не по заявкам.',
      ...chartBlock(s, 'funnel'),
    ],
  });

  sections.push({
    heading: 'Анализ по каналам',
    chartId: 'channelMix',
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
            ...chartBlock(s, 'channelMix'),
          ],
  });

  // Hypothesis sections — only when hypotheses exist
  if (hasHypotheses) {
    sections.push({
      heading: 'Приоритизация гипотез (по ICE)',
      lines: [
        'Все гипотезы, отсортированы по убыванию ICE. Сверху — то, что бьём первым:',
        '',
        ...allByPriority.map((h, i) => priorityLine(h, i + 1)),
      ],
    });

    sections.push({
      heading: 'Define — проблемные гипотезы (обзор)',
      lines: [
        `Заведено ${problems.length} проблемных гипотез. Полная карточка каждой — ниже.`,
        ...problems.map((h, i) => `  ${i + 1}) ${h.title} [ICE ${h.iceScore}]`),
      ],
    });
    sections.push(...problems.map((h, i) => hypothesisDetail(h, i + 1)));

    sections.push({
      heading: 'Develop — решенческие гипотезы (обзор)',
      lines: [
        `Заведено ${solutions.length} решенческих гипотез. Полная карточка каждой — ниже.`,
        ...solutions.map((h, i) => `  ${i + 1}) ${h.title} [ICE ${h.iceScore}]`),
      ],
    });
    sections.push(...solutions.map((h, i) => hypothesisDetail(h, problems.length + i + 1)));
  }

  // AI-generated hypotheses — only when they exist
  if (hasAiHypotheses) {
    sections.push(...aiHypothesisSections(s.generatedHypotheses));
  }

  // AI-proposed decisions — only when they exist (helper returns [] otherwise)
  sections.push(...aiDecisionSections(s.generatedDecisions));

  // Decision Log — always show
  sections.push({
    heading: 'Deliver — Decision Log (обзор)',
    lines:
      s.decisions.length === 0
        ? ['Завершённых проверок пока нет.']
        : [`Зафиксировано ${s.decisions.length} решений. Детали каждого — ниже.`],
  });
  sections.push(...s.decisions.map(decisionDetail));

  // AI analysis (chunked narrative parsed into sections)
  if (s.aiNarrative) {
    const aiSections = parseChunkedNarrative(s.aiNarrative);
    if (aiSections.length > 0) {
      // Push parsed sections directly — they already have proper headings from ## markers
      sections.push(...aiSections);
    } else {
      // Fallback: no ## headings found, use generic AI-анализ heading
      sections.push({
        heading: 'AI-анализ (интерпретация, проверяйте по данным)',
        lines: s.aiNarrative.split('\n').filter((l) => l.trim() !== ''),
      });
    }
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
      lines: !hasHypotheses
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
        'ИД среза — идентификатор неизменяемого среза данных; гарантирует идентичность DOCX/PDF/экрана.',
      ],
    },
    {
      heading: 'Приложение с данными',
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
