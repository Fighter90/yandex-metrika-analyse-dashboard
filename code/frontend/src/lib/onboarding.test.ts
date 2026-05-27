import { describe, it, expect } from 'vitest';
import { shouldShowOnboarding, markOnboarded, ONBOARDED_KEY } from './onboarding';

function fakeStore(
  initial: Record<string, string> = {},
): Storage & { _data: Record<string, string> } {
  const data = { ...initial };
  return {
    _data: data,
    getItem: (k: string): string | null => (k in data ? (data[k] ?? null) : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: (k: string) => {
      delete data[k];
    },
    clear: () => {
      for (const k of Object.keys(data)) delete data[k];
    },
    key: (i: number) => Object.keys(data)[i] ?? null,
    get length() {
      return Object.keys(data).length;
    },
  };
}

describe('shouldShowOnboarding', () => {
  it('is true when the key is absent', () => {
    expect(shouldShowOnboarding(fakeStore())).toBe(true);
  });

  it('is false when the key is set', () => {
    expect(shouldShowOnboarding(fakeStore({ [ONBOARDED_KEY]: '1' }))).toBe(false);
  });
});

describe('markOnboarded', () => {
  it('writes the key so the card no longer shows', () => {
    const store = fakeStore();
    markOnboarded(store);
    expect(store._data[ONBOARDED_KEY]).toBe('1');
    expect(shouldShowOnboarding(store)).toBe(false);
  });
});
