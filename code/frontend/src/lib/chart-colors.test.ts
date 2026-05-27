import { describe, it, expect } from 'vitest';
import { channelColor, METRIC_COLORS } from './chart-colors';

describe('channelColor', () => {
  it('maps each known Metrika channel to a distinct stable colour', () => {
    const names = [
      'Direct traffic',
      'Search engine traffic',
      'Internal traffic',
      'Mailing traffic',
      'Messenger traffic',
      'Social network traffic',
      'Recommendation system traffic',
      'Link traffic',
      'Ad traffic',
    ];
    const colors = names.map(channelColor);
    expect(new Set(colors).size).toBe(names.length); // all distinct, no fallback collisions
    expect(colors.every((c) => /^#[0-9A-F]{6}$/i.test(c))).toBe(true);
  });

  it('is case-insensitive and matches Russian channel names', () => {
    expect(channelColor('Переходы из поисковых систем')).toBe(
      channelColor('Search engine traffic'),
    );
    expect(channelColor('ПРЯМЫЕ ЗАХОДЫ')).toBe(channelColor('Direct traffic'));
  });

  it('falls back to a neutral colour for unknown channels', () => {
    expect(channelColor('что-то новое')).toBe('#64748B');
  });

  it('exposes a metric palette', () => {
    expect(METRIC_COLORS.payments).toMatch(/^#[0-9A-F]{6}$/i);
  });
});
