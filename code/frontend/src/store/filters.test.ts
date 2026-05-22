import { describe, it, expect, beforeEach } from 'vitest';
import { useFilters } from './filters';

const initial = useFilters.getState();
beforeEach(() => useFilters.setState(initial, true));

describe('useFilters', () => {
  it('has sensible defaults (14-day range, b2c_b2b, no archived)', () => {
    const s = useFilters.getState();
    expect(s.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.segment).toBe('b2c_b2b');
    expect(s.showArchived).toBe(false);
    expect(s.channels).toEqual([]);
  });

  it('sets range and segment', () => {
    useFilters.getState().setRange('2025-01-01', '2025-01-31');
    expect(useFilters.getState().from).toBe('2025-01-01');
    useFilters.getState().setSegment('b2b');
    expect(useFilters.getState().segment).toBe('b2b');
  });

  it('toggles a channel on and off', () => {
    useFilters.getState().toggleChannel('podcast');
    expect(useFilters.getState().channels).toEqual(['podcast']);
    useFilters.getState().toggleChannel('podcast');
    expect(useFilters.getState().channels).toEqual([]);
  });

  it('toggles archived', () => {
    useFilters.getState().toggleArchived();
    expect(useFilters.getState().showArchived).toBe(true);
  });

  it('applies a day preset', () => {
    useFilters.getState().preset(7);
    const s = useFilters.getState();
    expect(s.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(s.from <= s.to).toBe(true);
  });
});
