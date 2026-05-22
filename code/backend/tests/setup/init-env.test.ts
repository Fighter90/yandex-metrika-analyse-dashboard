import { describe, it, expect } from 'vitest';
import { applyInitValues } from '../../src/setup/init-env';

const ENV = [
  'YANDEX_OAUTH_TOKEN=',
  'COUNTER_ID=54280963',
  'GOAL_ID=0',
  'ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE',
  'ANTHROPIC_MODEL=claude-sonnet-4-6',
].join('\n');

describe('applyInitValues', () => {
  it('sets the provided keys in place, preserving other lines', () => {
    const out = applyInitValues(ENV, {
      anthropicKey: 'sk-ant-123',
      counterId: '99',
      goalId: '181333801',
    });
    expect(out).toContain('ANTHROPIC_API_KEY=sk-ant-123');
    expect(out).toContain('COUNTER_ID=99');
    expect(out).toContain('GOAL_ID=181333801');
    // untouched lines remain
    expect(out).toContain('YANDEX_OAUTH_TOKEN=');
    expect(out).toContain('ANTHROPIC_MODEL=claude-sonnet-4-6');
  });

  it('leaves .env unchanged when no values are provided (blank answers)', () => {
    expect(applyInitValues(ENV, {})).toBe(ENV);
  });

  it('applies only the provided subset', () => {
    const out = applyInitValues(ENV, { goalId: '42' });
    expect(out).toContain('GOAL_ID=42');
    expect(out).toContain('ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE'); // untouched
  });
});
