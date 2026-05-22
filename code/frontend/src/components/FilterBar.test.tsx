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

    fireEvent.click(screen.getByLabelText(/архивные/));
    expect(useFilters.getState().showArchived).toBe(true);
  });
});
