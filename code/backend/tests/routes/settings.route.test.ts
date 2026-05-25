import { describe, it, expect, vi, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { settingsRoutes } from '../../src/routes/settings';

function appWith(): FastifyInstance {
  const app = Fastify();
  app.register(settingsRoutes);
  return app;
}

describe('settings routes', () => {
  afterEach(async () => {});

  it('GET /settings returns masked config', async () => {
    const app = appWith();
    const res = await app.inject({ method: 'GET', url: '/settings' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty('YANDEX_OAUTH_TOKEN');
    expect(body).toHaveProperty('COUNTER_ID');
    expect(body).toHaveProperty('GOAL_ID');
    await app.close();
  });

  it('POST /settings saves and returns ok', async () => {
    const app = appWith();
    const res = await app.inject({
      method: 'POST',
      url: '/settings',
      payload: { COUNTER_ID: 99999, GOAL_ID: 0 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    await app.close();
  });

  it('POST /settings/refresh returns ok', async () => {
    const app = appWith();
    const res = await app.inject({
      method: 'POST',
      url: '/settings/refresh',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
    await app.close();
  });
});
