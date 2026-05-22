import type {
  Decision,
  GeoDeviceBreakdownRow,
  Hypothesis,
  PageBreakdownRow,
  ReportSnapshot,
  UtmBreakdownRow,
} from '@pca/shared';

export interface ReportSection {
  readonly heading: string;
  readonly lines: string[];
}

function utmLine(u: UtmBreakdownRow): string {
  return `${u.source} / ${u.medium} / ${u.campaign}: визитов ${u.visits}, заявок ${u.goalReaches}`;
}

function geoLine(g: GeoDeviceBreakdownRow): string {
  return `${g.country} · ${g.device}: визитов ${g.visits}, заявок ${g.goalReaches}`;
}

function pageLine(p: PageBreakdownRow): string {
  return `${p.page}: визитов ${p.visits}, отказы ${(p.bounceRate * 100).toFixed(1)}%, заявок ${p.goalReaches}`;
}

function hypothesisLine(h: Hypothesis): string {
  return `[ICE ${h.iceScore}] «${h.subject} ${h.action} ${h.solution}, если ${h.condition}» — статус ${h.status}, дедлайн ${h.deadlineAt}`;
}

function decisionLine(d: Decision): string {
  return `${d.number} [${d.outcome}] гипотеза #${d.hypothesisId}: ${d.nextStep}`;
}

function channelLine(c: ReportSnapshot['channels'][number]): string {
  return `${c.date} · ${c.channel}: визитов ${c.visits}, заявок ${c.goalReaches}`;
}

/**
 * Deterministic report content derived purely from the snapshot — DOCX and PDF both render
 * from this, so the report is reproducible (no Date.now, no live data).
 */
export function reportSections(s: ReportSnapshot): ReportSection[] {
  return [
    {
      heading: 'ProductCamp · Конверсии и лидген',
      lines: [
        `Период: ${s.period.from} — ${s.period.to}`,
        `Снапшот: ${s.id} · сформирован ${s.generatedAt}`,
        `KPI: цель ${s.kpi.target} платных билетов`,
      ],
    },
    {
      heading: 'Executive Summary',
      lines: [
        `Заявки B2C (goal reaches): ${s.kpi.b2cApplications}`,
        `Оплачено B2B (билетов): ${s.kpi.b2bPaidTickets}`,
        `Gap до цели (по оплатам): ${s.kpi.gap}`,
        'Заявка ≠ оплата — числа разделены явно.',
      ],
    },
    {
      heading: 'Methodology',
      lines: [
        'Double Diamond + методология Воронковой. ICE = I × C × E (произведение).',
        'Адаптировано из https://github.com/Voronik1801/Podlodka_crew_AI_Product',
      ],
    },
    { heading: 'Define — Problem Hypotheses', lines: s.hypotheses.problems.map(hypothesisLine) },
    { heading: 'Develop — Solution Hypotheses', lines: s.hypotheses.solutions.map(hypothesisLine) },
    { heading: 'Deliver — Decision Log', lines: s.decisions.map(decisionLine) },
    { heading: 'Топ источников UTM', lines: s.breakdowns.utm.map(utmLine) },
    { heading: 'Топ гео + устройства', lines: s.breakdowns.geoDevice.map(geoLine) },
    { heading: 'Топ страниц входа', lines: s.breakdowns.entryPages.map(pageLine) },
    { heading: 'Топ страниц выхода', lines: s.breakdowns.exitPages.map(pageLine) },
    {
      heading: 'Data Appendix',
      lines: [`Каналов в выборке: ${s.channels.length}`, ...s.channels.map(channelLine)],
    },
  ];
}
