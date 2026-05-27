import { describe, it, expect } from 'vitest';
import type {
  Decision,
  Hypothesis,
  HypothesisStatus,
  ProblemHypothesis,
  ReportSnapshot,
  SolutionHypothesis,
} from './index';
import { reportSections } from './index';
import { aiHypothesisSections } from './report-section-helpers';

const genProblem = (over: Partial<ProblemHypothesis> = {}): ProblemHypothesis => ({
  id: 'P01',
  segment: 'мобильный пользователь',
  trouble: 'не находит кнопку оплаты',
  action: 'покупке билета',
  barrier: 'кнопка скрыта под футером',
  evidence: '7 заявок B2C при 100 визитах',
  ...over,
});

const genSolution = (over: Partial<SolutionHypothesis> = {}): SolutionHypothesis => ({
  id: 'S01',
  problemId: 'P01',
  action: 'вынесем кнопку оплаты в первый экран',
  userBenefit: 'быстрее находить оплату',
  businessResult: 'рост конверсии B2C',
  successCriteria: 'CR +10%',
  risks: [
    { kind: 'value', note: 'может не повлиять' },
    { kind: 'usability', note: 'перегрузим экран' },
    { kind: 'feasibility', note: 'правка вёрстки' },
    { kind: 'business', note: 'низкий риск' },
    { kind: 'legal', note: 'нет' },
  ],
  validation: {
    whatToVerify: 'ценность',
    methods: ['A/B-тест', 'интервью'],
    audience: 'мобильные посетители',
    channel: 'tg',
    successCriteria: '≥10% рост CR',
  },
  ice: {
    impact: 8,
    confidence: 6,
    ease: 7,
    impactRationale: 'высокий трафик',
    confidenceRationale: 'есть данные',
    easeRationale: 'простая правка',
    score: 336,
  },
  ...over,
});

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
  b2bSummary: {
    totalTickets: 20,
    paidTickets: 20,
    dealsCount: 1,
    deals: [{ company: 'BigCorp', tickets: 20, stage: 'paid' }],
    byStage: [{ stage: 'paid', tickets: 20, deals: 1 }],
  },
  funnel: { visits: 100, b2cApplications: 7, b2bPipelineTickets: 0, b2bPaidTickets: 20 },
  breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
};

function findSection(s: ReportSnapshot, predicate: (h: string) => boolean): string[] {
  return reportSections(s).find((sec) => predicate(sec.heading))?.lines ?? [];
}

describe('reportSections — structure', () => {
  it('produces cover, summary, methodology, prioritization, overviews and appendix', () => {
    const headings = reportSections(baseSnapshot).map((s) => s.heading);
    expect(headings).toContain('ProductCamp · Конверсии и лидген');
    expect(headings).toContain('Краткие итоги');
    expect(headings).toContain('Методология');
    expect(headings).toContain('Приоритизация гипотез (по ICE)');
    expect(headings).toContain('Define — проблемные гипотезы (обзор)');
    expect(headings).toContain('Develop — решенческие гипотезы (обзор)');
    expect(headings).toContain('Deliver — Decision Log (обзор)');
    expect(headings).toContain('Приложение с данными');
  });

  it('is deterministic — same snapshot yields identical content', () => {
    expect(reportSections(baseSnapshot)).toEqual(reportSections(baseSnapshot));
  });

  it('renders methodology and ICE explanation', () => {
    const lines = findSection(baseSnapshot, (h) => h === 'Методология').join(' ');
    expect(lines).toContain('Double Diamond');
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
    expect(lines).toContain('Этап 1: Визиты — 100');
    expect(lines).toContain('Этап 2: Заявки B2C — 7');
    expect(lines).toContain('CR 7.0%');
    expect(lines).toContain('Оплачено B2B — 20 билетов');
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

  it('uses Russian terms: Срез данных, ИД среза, Краткие итоги, Приложение с данными', () => {
    const headings = reportSections(baseSnapshot).map((s) => s.heading);
    expect(headings).toContain('Краткие итоги');
    expect(headings).toContain('Приложение с данными');
    const cover = findSection(baseSnapshot, (h) => h === 'ProductCamp · Конверсии и лидген').join(
      '\n',
    );
    expect(cover).toContain('Срез данных:');
    expect(cover).toContain('ИД среза');
  });

  it('skips empty hypothesis sections entirely when no hypotheses exist', () => {
    const empty: ReportSnapshot = {
      ...baseSnapshot,
      hypotheses: { problems: [], solutions: [] },
      decisions: [],
      b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
      funnel: { visits: 0, b2cApplications: 0, b2bPipelineTickets: 0, b2bPaidTickets: 0 },
    };
    const headings = reportSections(empty).map((s) => s.heading);
    // Empty hypothesis sections are SKIPPED (not rendered with placeholder)
    expect(headings).not.toContain('Приоритизация гипотез (по ICE)');
    expect(headings).not.toContain('Define — проблемные гипотезы (обзор)');
    expect(headings).not.toContain('Develop — решенческие гипотезы (обзор)');
    expect(headings).not.toContain('Проблемные гипотезы (AI)');
    expect(headings).not.toContain('Решенческие гипотезы (AI)');
  });
});

describe('reportSections — full hypothesis detail', () => {
  it('spells out hypothesis fields, ICE breakdown, assumptions, methods and traffic-light', () => {
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
    expect(findSection(s, (h) => h === 'Приложение с данными').join(' ')).toContain('CR 0.0%');
  });

  it('shows empty-state copy for channels, UTM, geo, pages when nothing is present', () => {
    const empty: ReportSnapshot = {
      ...baseSnapshot,
      channels: [],
      hypotheses: { problems: [], solutions: [] },
      decisions: [],
      b2bSummary: { totalTickets: 0, paidTickets: 0, dealsCount: 0, deals: [], byStage: [] },
      funnel: { visits: 0, b2cApplications: 0, b2bPipelineTickets: 0, b2bPaidTickets: 0 },
      breakdowns: { utm: [], geoDevice: [], entryPages: [], exitPages: [] },
    };
    expect(findSection(empty, (h) => h === 'Анализ по каналам')[0]).toContain(
      'Нет данных по каналам',
    );
    expect(findSection(empty, (h) => h === 'Топ источников UTM')[0]).toContain('Нет данных UTM');
    expect(findSection(empty, (h) => h === 'Топ гео + устройства')[0]).toContain('Нет данных');
    expect(findSection(empty, (h) => h === 'Топ страниц входа')[0]).toContain('Нет данных');
    expect(findSection(empty, (h) => h === 'Топ страниц выхода')[0]).toContain('Нет данных');
    // Decision Log always shows
    expect(findSection(empty, (h) => h.startsWith('Deliver'))[0]).toContain('пока нет');
    // Roadmap shows "no hypotheses" message
    expect(findSection(empty, (h) => h.startsWith('Дорожная карта'))[0]).toContain(
      'дорожной карты пока нет',
    );
  });

  it('includes the AI-анализ section only when aiNarrative is present', () => {
    expect(reportSections(baseSnapshot).some((s) => s.heading.startsWith('AI-анализ'))).toBe(false);
    // Without ## headings, parseChunkedNarrative creates "Результирующий вывод"
    const withAi = reportSections({ ...baseSnapshot, aiNarrative: 'Итог: рост.\n\nРиски: отвал.' });
    const итог = withAi.find((s) => s.heading === 'Результирующий вывод');
    expect(итог?.lines).toEqual(['Итог: рост.', 'Риски: отвал.']);
  });
});

describe('reportSections — AI-generated hypotheses', () => {
  it('adds no AI-hypothesis sections when generatedHypotheses is absent', () => {
    const headings = reportSections(baseSnapshot).map((s) => s.heading);
    expect(headings).not.toContain('Приоритизация AI-гипотез (по ICE)');
    expect(headings).not.toContain('Проблемные гипотезы (AI)');
  });

  it('adds no AI-hypothesis sections when generatedHypotheses is empty', () => {
    const snap = { ...baseSnapshot, generatedHypotheses: { problems: [], solutions: [] } };
    const headings = reportSections(snap).map((s) => s.heading);
    expect(headings).not.toContain('Решенческие гипотезы (AI)');
  });

  it('renders problem + solution cards (risks, validation, ICE) sorted by ICE desc', () => {
    const snap: ReportSnapshot = {
      ...baseSnapshot,
      generatedHypotheses: {
        problems: [genProblem(), genProblem({ id: 'P02' })],
        solutions: [
          genSolution({ id: 'S01', ice: { ...genSolution().ice, score: 100 } }),
          genSolution({ id: 'S02', ice: { ...genSolution().ice, score: 500 } }),
        ],
      },
    };
    const sections = reportSections(snap);
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Приоритизация AI-гипотез (по ICE)');
    expect(headings).toContain('Проблемные гипотезы (AI)');
    expect(headings).toContain('Решенческие гипотезы (AI)');
    expect(headings).toContain('1. P01');

    const prio = sections
      .find((s) => s.heading === 'Приоритизация AI-гипотез (по ICE)')!
      .lines.join('\n');
    expect(prio.indexOf('S02')).toBeLessThan(prio.indexOf('S01')); // higher ICE first

    const sol = sections.find((s) => s.heading === '1. S02')!.lines.join('\n');
    expect(sol).toContain('Если');
    expect(sol).toContain('Ценность:');
    expect(sol).toContain('Юридический-репутационный:');
    expect(sol).toContain('План проверки:');
    expect(sol).toContain('= 500');

    const prob = sections.find((s) => s.heading === '1. P01')!.lines.join('\n');
    expect(prob).toContain('испытывает');
    expect(prob).toContain('Обоснование (данные):');
  });

  it('shows empty-side messages (problems only / solutions only)', () => {
    const solOnly = {
      ...baseSnapshot,
      generatedHypotheses: { problems: [], solutions: [genSolution()] },
    };
    expect(findSection(solOnly, (h) => h === 'Проблемные гипотезы (AI)').join(' ')).toContain(
      'не сгенерированы',
    );

    const probOnly = {
      ...baseSnapshot,
      generatedHypotheses: { problems: [genProblem()], solutions: [] },
    };
    expect(findSection(probOnly, (h) => h === 'Решенческие гипотезы (AI)').join(' ')).toContain(
      'не сгенерированы',
    );
    expect(
      findSection(probOnly, (h) => h === 'Приоритизация AI-гипотез (по ICE)').join(' '),
    ).toContain('ещё не сгенерированы');
  });
});

describe('reportSections — new sections', () => {
  it('renders B2B section when b2bSummary is present', () => {
    const s = {
      ...baseSnapshot,
      b2bSummary: {
        totalTickets: 35,
        paidTickets: 20,
        dealsCount: 2,
        deals: [
          { company: 'BigCorp', tickets: 20, stage: 'paid' },
          { company: 'SmallCo', tickets: 15, stage: 'lead' },
        ],
        byStage: [
          { stage: 'paid', tickets: 20, deals: 1 },
          { stage: 'lead', tickets: 15, deals: 1 },
        ],
      },
    } as ReportSnapshot & { b2bSummary: unknown };
    const b2bSec = reportSections(s).find((sec) => sec.heading === 'B2B-пайплайн');
    expect(b2bSec).toBeDefined();
    expect(b2bSec?.lines.join('\n')).toContain('BigCorp');
    expect(b2bSec?.lines.join('\n')).toContain('SmallCo');
  });

  it('renders detailed channel analysis section', () => {
    const lines =
      reportSections(baseSnapshot)
        .find((sec) => sec.heading === 'Анализ по каналам (детальный)')
        ?.lines.join('\n') ?? '';
    expect(lines).toContain('podcast');
    expect(lines).toContain('Визиты: 100');
  });

  it('parses chunked AI narrative into sections', () => {
    // The parseChunkedNarrative function is tested indirectly through reportSections
    // when aiNarrative is present. Here we test the fallback case.
    const s: ReportSnapshot = {
      ...baseSnapshot,
      aiNarrative: '## Test Section\n\nSome content\n\n---\n\n## Another Section\n\nMore content',
    };
    const sections = reportSections(s);
    const testSec = sections.find((sec) => sec.heading === 'Test Section');
    const anotherSec = sections.find((sec) => sec.heading === 'Another Section');
    expect(testSec).toBeDefined();
    expect(testSec?.lines.join(' ')).toContain('Some content');
    expect(anotherSec).toBeDefined();
    expect(anotherSec?.lines.join(' ')).toContain('More content');
  });
});

describe('aiHypothesisSections — direct unit tests', () => {
  // reportSections guards the call with hasAiHypotheses, which prevents calling
  // aiHypothesisSections with { problems: [], solutions: [] }. We test that path directly
  // to cover the right-hand branch of the `&&` compound condition at line 198.
  it('returns [] when called directly with both arrays empty', () => {
    expect(aiHypothesisSections({ problems: [], solutions: [] })).toEqual([]);
  });

  it('returns [] when called with undefined', () => {
    expect(aiHypothesisSections(undefined)).toEqual([]);
  });
});
