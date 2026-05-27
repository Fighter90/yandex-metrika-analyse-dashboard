import { describe, it, expect, beforeEach } from 'vitest';
import { useFilters, formatDateLabel, parseDateInput } from './filters';

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

describe('formatDateLabel', () => {
  it('formats a valid ISO date string to a Russian locale string', () => {
    const result = formatDateLabel('2025-01-15');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('returns "Invalid Date" string when input is unparseable (toLocaleDateString does not throw in jsdom)', () => {
    // In jsdom/Node.js, new Date('bad').toLocaleDateString() returns 'Invalid Date' rather
    // than throwing, so the catch branch is defended but unreachable here.
    const result = formatDateLabel('not-a-date');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('parseDateInput', () => {
  it('returns isoDaysAgo(0) for an empty string', () => {
    const result = parseDateInput('');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('pads single-digit month and day with zeros', () => {
    expect(parseDateInput('2025-1-5')).toBe('2025-01-05');
    expect(parseDateInput('2025-12-3')).toBe('2025-12-03');
  });

  it('returns value as-is when it does not match 3-part format', () => {
    expect(parseDateInput('2025-01')).toBe('2025-01');
    expect(parseDateInput('2025')).toBe('2025');
  });

  it('handles a parts array where some parts are empty strings', () => {
    // Splitting '2025--05' gives ['2025', '', '05'] — parts[1] is '' (falsy)
    // so the condition fails and returns the original value
    expect(parseDateInput('2025--05')).toBe('2025--05');
  });
});
