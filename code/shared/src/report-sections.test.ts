import { describe, it, expect } from 'vitest';
import type { Decision, Hypothesis, HypothesisStatus, ReportSnapshot } from './index';
import { reportSections } from './index';

const hyp = (over: Partial<Hypothesis>): Hypothesis => ({
  id: 1,
  diamondPhase: 'define',
  kind: 'problem',
  subject: 'слушатель',
  action: 'не покупает',
  solution: 'билет',
  condition: 'нет лендинга',
  title: 'Гипотеза',
  hiddenAssumptions: [
    { category: 'behavior', text: 'готов платить' },
    { category: 'market', text: 'есть спрос' },
    { category: 'tech', text: 'оплата работает' },
  ],
  validationMethods: [
    { type: 'live', plan: 'A/B', cost: 'средняя' },
    { type: 'quantitative', plan: 'воронка' },
  ],
  impact: 8,
  confidence: 6,
  ease: 7,
  impactRationale: 'ri',
  confidenceRationale: 'rc',
  easeRationale: 're',
  iceScore: 336,
  greenCriteria: 'g',
  yellowCriteria: 'y',
  redCriteria: 'r',
  deadlineDays: 5,
  deadlineAt: '2999-01-01T00:00:00.000Z',
  status: 'draft',
  createdAt: 'c',
  updatedAt: 'u',
  ...over,
});

const decision = (over: Partial<Decision> = {}): Decision => ({
  id: 1,
  number: 'DL-001',
  hypothesisId: 1,
  date: '2025-01-10',
  method: 'mixed',
  scope: '5 интервью',
  periodDays: 5,
  findings: [{ text: 'находка', confidence: 'high' }],
  evidence: [{ quote: 'q', source: 's', rawResponseId: 42 }],
  outcome: 'yellow',
  outcomeRationale: 'ro',
  nextStep: 'онлайн-оплата',
  responsible: 'Сергей',
  nextDeadline: '2025-02-01',
  decidedBy: 'team',
  participants: 'Лиза',
  createdAt: 'c',
  updatedAt: 'u',
  ...over,
});

const baseSnapshot: ReportSnapshot = {
  id: 'snap-1',
  generatedAt: 'T',
  period: { from: '2025-01-01', to: '2025-01-07' },
  kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
  channels: [
    {
      date: '2025-01-02',
      channel: 'podcast',
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      visits: 100,
      users: 90,
      bounceRate: 0.2,
      avgDuration: 60,
      goalReaches: 7,
      conversionRate: 0.07,
    },
  ],
  hypotheses: {
    problems: [hyp({ kind: 'problem' })],
    solutions: [hyp({ id: 2, kind: 'solution' })],
  },
  decisions: [decision()],
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

function findSection(s: ReportSnapshot, predicate: (h: string) => boolean): string[] {
  return reportSections(s).find((sec) => predicate(sec.heading))?.lines ?? [];
}

describe('reportSections — structure', () => {
  it('produces cover, summary, methodology, prioritization, overviews and appendix', () => {
    const headings = reportSections(baseSnapshot).map((s) => s.heading);
    expect(headings).toContain('ProductCamp · Конверсии и лидген');
    expect(headings).toContain('Executive Summary');
    expect(headings).toContain('Методология');
    expect(headings).toContain('Приоритизация гипотез (по ICE)');
    expect(headings).toContain('Define — проблемные гипотезы (обзор)');
    expect(headings).toContain('Develop — решенческие гипотезы (обзор)');
    expect(headings).toContain('Deliver — Decision Log (обзор)');
    expect(headings).toContain('Data Appendix');
  });

  it('is deterministic — same snapshot yields identical content', () => {
    expect(reportSections(baseSnapshot)).toEqual(reportSections(baseSnapshot));
  });

  it('renders methodology attribution and ICE explanation', () => {
    const lines = findSection(baseSnapshot, (h) => h === 'Методология').join(' ');
    expect(lines).toContain('Voronik1801');
    expect(lines).toContain('Impact × Confidence × Ease');
  });

  it('orders prioritization by descending ICE', () => {
    const s: ReportSnapshot = {
      ...baseSnapshot,
      hypotheses: {
        problems: [hyp({ id: 1, iceScore: 100, title: 'low' })],
        solutions: [hyp({ id: 2, kind: 'solution', iceScore: 800, title: 'top' })],
      },
    };
    const lines = findSection(s, (h) => h.startsWith('Приоритизация'));
    expect(lines[2]).toContain('ICE 800');
    expect(lines[3]).toContain('ICE 100');
  });

  it('renders the funnel with visit→application conversion (заявка ≠ оплата)', () => {
    const lines = findSection(baseSnapshot, (h) => h.startsWith('Воронка')).join('\n');
    expect(lines).toContain('Визиты (сумма по каналам за период): 100');
    expect(lines).toContain('конверсия визит→заявка 7.0%');
    expect(lines).toContain('Оплачено B2B (билетов): 20');
    expect(lines).toContain('Gap до цели');
  });

  it('aggregates channels per name with CR in the channel-analysis section', () => {
    const ch = baseSnapshot.channels[0]!;
    const s: ReportSnapshot = {
      ...baseSnapshot,
      channels: [
        { ...ch, channel: 'podcast', visits: 100, goalReaches: 5 },
        { ...ch, date: '2025-01-03', channel: 'podcast', visits: 100, goalReaches: 5 },
        { ...ch, channel: 'zeta', visits: 50, goalReaches: 1 },
        { ...ch, channel: 'direct', visits: 50, goalReaches: 10 },
      ],
    };
    const lines = findSection(s, (h) => h === 'Анализ по каналам');
    expect(lines[2]).toContain('podcast: визитов 200, заявок 10 (CR 5.0%)'); // summed across days
    // direct and zeta tie on visits (50) → alphabetical tie-break puts direct before zeta
    expect(lines[3]).toContain('direct: визитов 50, заявок 10 (CR 20.0%)');
    expect(lines[4]).toContain('zeta: визитов 50');
  });

  it('lists the top-3 ICE roadmap and a glossary', () => {
    const roadmap = findSection(baseSnapshot, (h) => h.startsWith('Дорожная карта')).join('\n');
    expect(roadmap).toContain('цель:');
    expect(roadmap).toContain('дедлайн');
    const glossary = findSection(baseSnapshot, (h) => h.startsWith('Глоссарий')).join('\n');
    expect(glossary).toContain('Заявка');
    expect(glossary).toContain('ICE');
  });
});

describe('reportSections — full hypothesis detail', () => {
  it('spells out Voronkova fields, ICE breakdown, assumptions, methods and traffic-light', () => {
    const lines = findSection(baseSnapshot, (h) => h === '1. Гипотеза').join('\n');
    expect(lines).toContain('«слушатель не покупает билет, если нет лендинга»');
    expect(lines).toContain('I × C × E = 8 × 6 × 7 = 336');
    expect(lines).toContain('[Поведение] готов платить');
    expect(lines).toContain('[Рынок] есть спрос');
    expect(lines).toContain('[Технологии] оплата работает');
    expect(lines).toContain('Живой тест: A/B (стоимость: средняя)');
    expect(lines).toContain('Количественный анализ: воронка');
    expect(lines).toContain('🟢 Зелёный — g');
    expect(lines).toContain('🔴 Красный — r');
  });

  it('renders description, evidence variants and develop phase label', () => {
    const h = hyp({
      diamondPhase: 'develop',
      kind: 'solution',
      description: 'описание',
      evidence: [
        { type: 'channel_stats', rawResponseId: 7, slice: 'podcast', note: 'низкий CR' },
        { type: 'manual' },
      ],
    });
    const lines = findSection(
      { ...baseSnapshot, hypotheses: { problems: [], solutions: [h] } },
      (x) => x.startsWith('1.'),
    ).join('\n');
    expect(lines).toContain('Описание: описание');
    expect(lines).toContain('Develop (решение)');
    expect(lines).toContain('[raw_response_id 7]');
    expect(lines).toContain('срез: podcast');
    expect(lines).toContain('— низкий CR');
    expect(lines).toContain('• manual'); // no ref/slice/note
  });

  it('shows fallbacks when assumptions / methods are empty', () => {
    const h = hyp({ hiddenAssumptions: [], validationMethods: [] });
    const lines = findSection(
      { ...baseSnapshot, hypotheses: { problems: [h], solutions: [] } },
      (x) => x.startsWith('1.'),
    ).join('\n');
    expect(lines).toContain('Скрытые допущения (0):');
    expect(lines).toContain('Методы проверки (0):');
    expect((lines.match(/— не зафиксированы/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('covers all status labels and ICE buckets', () => {
    const statuses: HypothesisStatus[] = [
      'draft',
      'in_progress',
      'green',
      'yellow',
      'red',
      'expired',
    ];
    const problems = statuses.map((status, i) => hyp({ id: i + 1, status, iceScore: 100 + i }));
    const buckets = [100, 294, 648, 800].map((iceScore, i) =>
      hyp({ id: 100 + i, kind: 'solution', iceScore }),
    );
    const prio = findSection(
      { ...baseSnapshot, hypotheses: { problems, solutions: buckets } },
      (h) => h.startsWith('Приоритизация'),
    ).join('\n');
    expect(prio).toContain('черновик');
    expect(prio).toContain('в работе');
    expect(prio).toContain('🟢 подтверждена');
    expect(prio).toContain('🟡 частично подтверждена');
    expect(prio).toContain('🔴 опровергнута');
    expect(prio).toContain('⏳ просрочена');
    expect(prio).toContain('низкий');
    expect(prio).toContain('средний');
    expect(prio).toContain('высокий');
    expect(prio).toContain('топ-приоритет');
  });
});

describe('reportSections — decision detail', () => {
  it('renders findings, evidence with raw id, rationale, next step and optional fields', () => {
    const lines = findSection(baseSnapshot, (h) => h.startsWith('DL-001')).join('\n');
    expect(lines).toContain('решение: YELLOW');
    expect(lines).toContain('[уверенность: high] находка');
    expect(lines).toContain('«q» — s [raw_response_id 42]');
    expect(lines).toContain('Следующий шаг: онлайн-оплата');
    expect(lines).toContain('Ответственный: Сергей');
    expect(lines).toContain('Дедлайн следующего шага: 2025-02-01');
    expect(lines).toContain('участники: Лиза');
  });

  it('handles empty findings, missing optionals and evidence without raw id', () => {
    const d = decision({
      findings: [],
      evidence: [{ quote: 'q2', source: 's2' }],
      responsible: undefined,
      nextDeadline: undefined,
      participants: undefined,
    });
    const lines = findSection({ ...baseSnapshot, decisions: [d] }, (h) =>
      h.startsWith('DL-001'),
    ).join('\n');
    expect(lines).toContain('Находки (0):');
    expect(lines).toContain('— не зафиксированы');
    expect(lines).toContain('«q2» — s2');
    expect(lines).not.toContain('[raw_response_id');
    expect(lines).not.toContain('Ответственный:');
    expect(lines).not.toContain('участники:');
  });
});

describe('reportSections — breakdowns, AI and empty states', () => {
  it('renders breakdown lines with CR when present', () => {
    const s: ReportSnapshot = {
      ...baseSnapshot,
      breakdowns: {
        utm: [{ source: 'vk', medium: 'cpc', campaign: 'spring', visits: 80, goalReaches: 4 }],
        geoDevice: [{ country: 'Россия', device: 'mobile', visits: 60, goalReaches: 3 }],
        entryPages: [{ page: '/lp', visits: 70, bounceRate: 0.25, goalReaches: 4 }],
        exitPages: [{ page: '/checkout', visits: 40, bounceRate: 0.6, goalReaches: 2 }],
      },
    };
    expect(findSection(s, (h) => h === 'Топ источников UTM')[0]).toContain('vk / cpc / spring');
    expect(findSection(s, (h) => h === 'Топ источников UTM')[0]).toContain('CR 5.0%');
    expect(findSection(s, (h) => h === 'Топ гео + устройства')[0]).toContain('Россия · mobile');
    expect(findSection(s, (h) => h === 'Топ страниц входа')[0]).toContain('25.0%');
    expect(findSection(s, (h) => h === 'Топ страниц выхода')[0]).toContain('/checkout');
  });

  it('handles zero-visit rows (CR 0.0%) without dividing by zero', () => {
    const s: ReportSnapshot = {
      ...baseSnapshot,
      channels: [{ ...baseSnapshot.channels[0]!, visits: 0, goalReaches: 0 }],
      breakdowns: {
        utm: [{ source: 'x', medium: 'y', campaign: 'z', visits: 0, goalReaches: 0 }],
        geoDevice: [{ country: 'RU', device: 'mobile', visits: 0, goalReaches: 0 }],
        entryPages: [],
        exitPages: [],
      },
    };
    expect(findSection(s, (h) => h === 'Топ источников UTM')[0]).toContain('CR 0.0%');
    expect(findSection(s, (h) => h === 'Топ гео + устройства')[0]).toContain('CR 0.0%');
    expect(findSection(s, (h) => h === 'Data Appendix').join(' ')).toContain('CR 0.0%');
  });

  it('shows empty-state copy when nothing is present', () => {
    const empty: ReportSnapshot = {
      ...baseSnapshot,
      channels: [],
      hypotheses: { problems: [], solutions: [] },
      decisions: [],
      breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
    };
    expect(findSection(empty, (h) => h.startsWith('Приоритизация'))[0]).toContain(
      'приоритизировать нечего',
    );
    expect(findSection(empty, (h) => h === 'Анализ по каналам')[0]).toContain(
      'Нет данных по каналам',
    );
    expect(findSection(empty, (h) => h.startsWith('Дорожная карта'))[0]).toContain(
      'дорожной карты пока нет',
    );
    expect(findSection(empty, (h) => h.startsWith('Define'))[0]).toContain('ещё не заведены');
    expect(findSection(empty, (h) => h.startsWith('Develop'))[0]).toContain('ещё не заведены');
    expect(findSection(empty, (h) => h.startsWith('Deliver'))[0]).toContain('пока нет');
    expect(findSection(empty, (h) => h === 'Топ источников UTM')[0]).toContain('Нет данных UTM');
    expect(findSection(empty, (h) => h === 'Топ гео + устройства')[0]).toContain('Нет данных');
    expect(findSection(empty, (h) => h === 'Топ страниц входа')[0]).toContain('Нет данных');
    expect(findSection(empty, (h) => h === 'Топ страниц выхода')[0]).toContain('Нет данных');
  });

  it('includes the AI-анализ section only when aiNarrative is present', () => {
    expect(reportSections(baseSnapshot).some((s) => s.heading.startsWith('AI-анализ'))).toBe(false);
    const withAi = reportSections({ ...baseSnapshot, aiNarrative: 'Итог: рост.\n\nРиски: отвал.' });
    const ai = withAi.find((s) => s.heading.startsWith('AI-анализ'));
    expect(ai?.lines).toEqual(['Итог: рост.', 'Риски: отвал.']);
  });
});
