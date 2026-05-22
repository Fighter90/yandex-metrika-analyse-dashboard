import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { B2bDeal } from '@pca/shared';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({
  api: {
    b2b: vi.fn(),
    createB2b: vi.fn(),
    updateB2bStage: vi.fn(),
    removeB2b: vi.fn(),
  },
}));
import { api } from '../lib/api';
import { B2bView, B2b } from './b2b';

const deal: B2bDeal = {
  id: 7,
  company: 'BigCorp',
  tickets: 20,
  stage: 'lead',
  dateAdded: '2025-01-01',
};

describe('B2bView', () => {
  it('renders pipeline summary + table and wires row actions', () => {
    const onAdd = vi.fn();
    const onStageChange = vi.fn();
    const onRemove = vi.fn();
    render(
      <B2bView deals={[deal]} onAdd={onAdd} onStageChange={onStageChange} onRemove={onRemove} />,
    );

    expect(screen.getByText('BigCorp')).toBeInTheDocument();
    expect(screen.getByText(/оплачено \(в KPI 300\)/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Этап BigCorp'), { target: { value: 'paid' } });
    expect(onStageChange).toHaveBeenCalledWith({ id: 7, stage: 'paid' });

    fireEvent.click(screen.getByLabelText('Удалить BigCorp'));
    expect(onRemove).toHaveBeenCalledWith(7);
  });

  it('adds a deal via the form (and ignores empty submits)', () => {
    const onAdd = vi.fn();
    render(<B2bView deals={[]} onAdd={onAdd} onStageChange={vi.fn()} onRemove={vi.fn()} />);

    // Empty submit → ignored.
    fireEvent.click(screen.getByText('Добавить'));
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Компания'), { target: { value: 'NewCo' } });
    fireEvent.change(screen.getByLabelText('Билеты'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Этап новой сделки'), {
      target: { value: 'negotiation' },
    });
    fireEvent.click(screen.getByText('Добавить'));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'NewCo', tickets: 12, stage: 'negotiation' }),
    );
  });
});

describe('B2b (data + mutations wrapper)', () => {
  beforeEach(() => {
    vi.mocked(api.b2b).mockResolvedValue([deal]);
    vi.mocked(api.createB2b).mockResolvedValue({ ...deal, id: 8, company: 'NewCo' });
    vi.mocked(api.updateB2bStage).mockResolvedValue({ ...deal, stage: 'paid' });
    vi.mocked(api.removeB2b).mockResolvedValue(undefined);
  });

  it('loads deals and triggers create/stage/remove mutations', async () => {
    renderWithProviders(<B2b />);
    expect(await screen.findByText('BigCorp')).toBeInTheDocument();

    // Stage change first (before an invalidation refetch can detach the row).
    // Exact arg shapes are asserted in the pure B2bView test; here we just confirm the
    // wrapper wires each mutation (covering the mutationFns + shared invalidate).
    fireEvent.change(screen.getByLabelText('Этап BigCorp'), { target: { value: 'invoiced' } });
    await waitFor(() => expect(api.updateB2bStage).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Компания'), { target: { value: 'NewCo' } });
    fireEvent.change(screen.getByLabelText('Билеты'), { target: { value: '5' } });
    fireEvent.click(screen.getByText('Добавить'));
    await waitFor(() => expect(api.createB2b).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText('Удалить BigCorp'));
    await waitFor(() => expect(api.removeB2b).toHaveBeenCalled());
  });
});
