import { describe, it, expect } from 'vitest';
import { buildHypothesisUrl, parseHypothesisSeed, hasSeed } from './hypothesis-prefill';

describe('buildHypothesisUrl', () => {
  it('returns the bare path when the seed is empty', () => {
    expect(buildHypothesisUrl({})).toBe('/hypotheses');
  });

  it('omits empty-string fields', () => {
    expect(buildHypothesisUrl({ segment: '', evidence: 'CR 0.7%' })).toBe(
      '/hypotheses?evidence=CR+0.7%25',
    );
  });

  it('URL-encodes all provided fields', () => {
    const url = buildHypothesisUrl({
      segment: 'Подкаст & радио',
      evidence: 'CR 0.7% при 1300 визитах',
    });
    const seed = parseHypothesisSeed(url.split('?')[1] ?? '');
    expect(seed.segment).toBe('Подкаст & радио');
    expect(seed.evidence).toBe('CR 0.7% при 1300 визитах');
  });
});

describe('parseHypothesisSeed', () => {
  it('round-trips every field through build → parse', () => {
    const seed = {
      segment: 'organic',
      trouble: 'низкая конверсия',
      action: 'оставить заявку',
      barrier: 'длинная форма',
      evidence: 'CR 0.5% при 2000 визитах',
    };
    const url = buildHypothesisUrl(seed);
    const search = url.split('?')[1] ?? '';
    expect(parseHypothesisSeed(search)).toEqual(seed);
  });

  it('accepts a URLSearchParams instance', () => {
    const params = new URLSearchParams({ segment: 'paid' });
    expect(parseHypothesisSeed(params)).toEqual({ segment: 'paid' });
  });

  it('ignores empty values and missing keys', () => {
    expect(parseHypothesisSeed('segment=&evidence=x')).toEqual({ evidence: 'x' });
    expect(parseHypothesisSeed('')).toEqual({});
  });
});

describe('hasSeed', () => {
  it('is false for an empty seed', () => {
    expect(hasSeed({})).toBe(false);
    expect(hasSeed({ segment: '' })).toBe(false);
  });

  it('is true when any field is populated', () => {
    expect(hasSeed({ evidence: 'CR 0.7%' })).toBe(true);
  });
});
