import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { Hypothesis } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({ api: { hypotheses: vi.fn(), createHypothesis: vi.fn() } }));
import { api } from '../lib/api';
import { HypothesisEditor, HypothesesView, Hypotheses } from './hypotheses';

const sample: Hypothesis = {
  id: 1,
  diamondPhase: 'define',
  kind: 'problem',
  subject: 'слушатель',
  action: 'не покупает',
  solution: 'билет',
  condition: 'нет лендинга',
  title: 'Подкаст → низкая конверсия',
  hiddenAssumptions: [
    { category: 'behavior', text: 'b' },
    { category: 'market', text: 'm' },
    { category: 'tech', text: 't' },
  ],
  validationMethods: [
    { type: 'quantitative', plan: 'q' },
    { type: 'synthetic', plan: 's' },
  ],
  impact: 8,
  confidence: 6,
  ease: 7,
  impactRationale: 'r1',
  confidenceRationale: 'r2',
  easeRationale: 'r3',
  iceScore: 336,
  greenCriteria: 'g',
  yellowCriteria: 'y',
  redCriteria: 'r',
  deadlineDays: 5,
  deadlineAt: '2999-01-01T00:00:00.000Z',
  status: 'draft',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

function set(label: string, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

/** Fill every required field so validateHypothesis passes. */
function fillValid(): void {
  set('Subject (ЦА)', 'слушатель');
  set('Action', 'не покупает');
  set('Solution', 'билет');
  set('Condition (если)', 'нет лендинга');
  set('Title', 'подкаст');
  set('Допущение: behavior', 'b');
  set('Допущение: market', 'm');
  set('Допущение: tech', 't');
  set('Метод 1 тип', 'live');
  set('Метод 1 план', 'SQL');
  set('Метод 2 тип', 'market');
  set('Метод 2 план', 'custdev');
  set('Impact', '8');
  set('Confidence', '6');
  set('Ease', '7');
  set('Дней на проверку', '5');
  set('Impact rationale', 'r1');
  set('Confidence rationale', 'r2');
  set('Ease rationale', 'r3');
  set('🟢 Green', 'g');
  set('🟡 Yellow', 'y');
  set('🔴 Red', 'r');
}

describe('HypothesisEditor', () => {
  it('blocks Save until valid, ignores invalid submit, then creates', () => {
    const onCreate = vi.fn();
    render(<HypothesisEditor onCreate={onCreate} />);

    const btn = screen.getByRole('button', { name: /Сохранить/ });
    expect(btn).toBeDisabled();
    expect(screen.getByLabelText('Ошибки валидации')).toBeInTheDocument();

    // Programmatic submit while invalid → no-op.
    fireEvent.submit(screen.getByRole('form', { name: 'Новая гипотеза' }));
    expect(onCreate).not.toHaveBeenCalled();

    fillValid();
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0]?.[0]).toMatchObject({
      subject: 'слушатель',
      hiddenAssumptions: expect.arrayContaining([{ category: 'tech', text: 't' }]),
    });
  });
});

describe('HypothesesView', () => {
  it('renders pending / error / empty / list states', () => {
    const onCreate = vi.fn();
    const { rerender } = render(
      <HypothesesView status="pending" hypotheses={[]} onCreate={onCreate} />,
    );
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();

    rerender(<HypothesesView status="error" hypotheses={[]} onCreate={onCreate} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    rerender(<HypothesesView status="success" hypotheses={[]} onCreate={onCreate} />);
    expect(screen.getByText('Гипотез пока нет.')).toBeInTheDocument();

    rerender(<HypothesesView status="success" hypotheses={[sample]} onCreate={onCreate} />);
    expect(screen.getByText(sample.title)).toBeInTheDocument();
    expect(screen.getByText('336')).toBeInTheDocument();
  });
});

describe('Hypotheses (wrapper)', () => {
  beforeEach(() => {
    vi.mocked(api.hypotheses).mockResolvedValue([sample]);
    vi.mocked(api.createHypothesis).mockResolvedValue(sample);
  });

  it('loads the list and creates a hypothesis', async () => {
    renderWithProviders(<Hypotheses />);
    expect(await screen.findByText(sample.title)).toBeInTheDocument();

    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /Сохранить/ }));
    await waitFor(() => expect(api.createHypothesis).toHaveBeenCalled());
  });
});
