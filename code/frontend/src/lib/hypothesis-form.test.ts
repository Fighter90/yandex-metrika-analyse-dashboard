import { describe, it, expect } from 'vitest';
import { emptyForm, formToInput, daysToDeadline } from './hypothesis-form';

describe('emptyForm', () => {
  it('starts as a draft problem with ICE 5/5/5', () => {
    const f = emptyForm();
    expect(f.kind).toBe('problem');
    expect([f.impact, f.confidence, f.ease]).toEqual([5, 5, 5]);
  });
});

describe('formToInput', () => {
  it('includes only non-empty assumptions and methods', () => {
    const input = formToInput({
      ...emptyForm(),
      behavior: 'b',
      market: 'm',
      tech: '', // empty → dropped
      method1Plan: 'q',
      method2Plan: '', // empty → dropped
    });
    expect(input.hiddenAssumptions.map((a) => a.category)).toEqual(['behavior', 'market']);
    expect(input.validationMethods).toHaveLength(1);
  });

  it('maps a fully-filled form to all three assumptions and two methods', () => {
    const input = formToInput({
      ...emptyForm(),
      behavior: 'b',
      market: 'm',
      tech: 't',
      method1Plan: 'q',
      method2Plan: 's',
    });
    expect(input.hiddenAssumptions).toHaveLength(3);
    expect(input.validationMethods).toHaveLength(2);
  });
});

describe('daysToDeadline', () => {
  it('computes whole days from a fixed now', () => {
    const now = Date.parse('2025-01-01T00:00:00Z');
    expect(daysToDeadline('2025-01-06T00:00:00Z', now)).toBe(5);
    expect(daysToDeadline('2024-12-31T00:00:00Z', now)).toBe(-1);
  });
});
