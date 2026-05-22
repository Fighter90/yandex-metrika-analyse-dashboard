import { describe, it, expect } from 'vitest';
import { errorMessage } from './error-message';

describe('errorMessage', () => {
  it('returns the message of an error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns undefined when there is no error', () => {
    expect(errorMessage(undefined)).toBeUndefined();
    expect(errorMessage(null)).toBeUndefined();
  });
});
