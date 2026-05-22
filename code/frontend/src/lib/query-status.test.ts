import { describe, it, expect } from 'vitest';
import { combineStatus } from './query-status';

describe('combineStatus', () => {
  it('returns error if either side errored, success only if both succeeded, else pending', () => {
    expect(combineStatus('error', 'success')).toBe('error');
    expect(combineStatus('success', 'error')).toBe('error');
    expect(combineStatus('success', 'success')).toBe('success');
    expect(combineStatus('success', 'pending')).toBe('pending');
    expect(combineStatus('pending', 'pending')).toBe('pending');
  });
});
