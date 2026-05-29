import { describe, it, expect } from 'vitest';
import { applyInitValues } from '../../src/setup/init-env';

const ENV = [
  'YANDEX_OAUTH_TOKEN=',
  'YANDEX_CLIENT_ID=YOUR_CLIENT_ID_HERE',
  'YANDEX_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE',
  'COUNTER_ID=12345678',
  'GOAL_ID=0',
  'ANTHROPIC_API_KEY=YOUR_ANTHROPIC_API_KEY_HERE',
  'ANTHROPIC_MODEL=claude-sonnet-4-6',
].join('\n');

describe('applyInitValues', () => {
  it('sets the provided keys in place, preserving other lines', () => {
    const out = applyInitValues(ENV, {
      anthropicKey: 'sk-ant-123',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      counterId: '99',
      goalId: '181333801',
    });
    expect(out).toContain('ANTHROPIC_API_KEY=sk-ant-123');
    expect(out).toContain('YANDEX_CLIENT_ID=test-client-id');
    expect(out).toContain('YANDEX_CLIENT_SECRET=test-client-secret');
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
