import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import { useFilters } from '../store/filters';

const initial = useFilters.getState();
beforeEach(() => useFilters.setState(initial, true));

describe('FilterBar', () => {
  it('applies preset, segment and archived toggle', () => {
    render(<FilterBar />);

    fireEvent.click(screen.getByText('7д'));
    expect(useFilters.getState().from <= useFilters.getState().to).toBe(true);

    fireEvent.change(screen.getByLabelText('Сегмент'), { target: { value: 'b2b' } });
    expect(useFilters.getState().segment).toBe('b2b');

    fireEvent.click(screen.getByLabelText(/архивные/i));
    expect(useFilters.getState().showArchived).toBe(true);
  });

  it('shows the 1г (1 year) preset button', () => {
    render(<FilterBar />);
    expect(screen.getByText('1г')).toBeInTheDocument();
  });

  it('toggles custom date picker visibility', () => {
    render(<FilterBar />);
    // Custom date picker is hidden initially
    expect(screen.queryByLabelText('От:')).not.toBeInTheDocument();
    // Click 📅 Даты to open
    fireEvent.click(screen.getByText(/Даты/));
    expect(screen.getByLabelText('От:')).toBeInTheDocument();
    // Click again to close
    fireEvent.click(screen.getByText(/Даты/));
    expect(screen.queryByLabelText('От:')).not.toBeInTheDocument();
  });

  it('shows validation error when date range exceeds 365 days', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByText(/Даты/));
    fireEvent.change(screen.getByLabelText('От:'), { target: { value: '2020-01-01' } });
    fireEvent.change(screen.getByLabelText('До:'), { target: { value: '2025-12-31' } });
    fireEvent.click(screen.getByText('Применить'));
    expect(screen.getByText(/Максимальный период/)).toBeInTheDocument();
  });

  it('shows validation error when end date is before start date', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByText(/Даты/));
    fireEvent.change(screen.getByLabelText('От:'), { target: { value: '2025-06-15' } });
    fireEvent.change(screen.getByLabelText('До:'), { target: { value: '2025-06-10' } });
    fireEvent.click(screen.getByText('Применить'));
    expect(screen.getByText(/позже/)).toBeInTheDocument();
  });

  it('applies custom date range when valid', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByText(/Даты/));
    fireEvent.change(screen.getByLabelText('От:'), { target: { value: '2025-01-01' } });
    fireEvent.change(screen.getByLabelText('До:'), { target: { value: '2025-01-31' } });
    fireEvent.click(screen.getByText('Применить'));
    expect(useFilters.getState().from).toBe('2025-01-01');
    expect(useFilters.getState().to).toBe('2025-01-31');
  });

  it('closes custom date picker on ✕ button click', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByText(/Даты/));
    expect(screen.getByLabelText('От:')).toBeInTheDocument();
    fireEvent.click(screen.getByText('✕'));
    expect(screen.queryByLabelText('От:')).not.toBeInTheDocument();
  });

  it('opens the mobile filter sheet and closes it via «Готово»', () => {
    render(<FilterBar />);
    const trigger = screen.getByRole('button', { name: 'Фильтры' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByText('Готово'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mobile filter sheet via the backdrop', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByRole('button', { name: 'Фильтры' }));
    fireEvent.click(screen.getByLabelText('Закрыть фильтры'));
    expect(screen.getByRole('button', { name: 'Фильтры' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('clears dateError when date input changes', () => {
    render(<FilterBar />);
    fireEvent.click(screen.getByText(/Даты/));
    // First trigger an error
    fireEvent.change(screen.getByLabelText('От:'), { target: { value: '2025-06-15' } });
    fireEvent.change(screen.getByLabelText('До:'), { target: { value: '2025-06-10' } });
    fireEvent.click(screen.getByText('Применить'));
    expect(screen.getByText(/позже/)).toBeInTheDocument();
    // Then change an input — should clear the error
    fireEvent.change(screen.getByLabelText('От:'), { target: { value: '2025-01-01' } });
    expect(screen.queryByText(/позже/)).not.toBeInTheDocument();
  });
});
