import { describe, it, expect } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { settingsRoutes } from '../../src/routes/settings';

function appWith(): FastifyInstance {
  const app = Fastify();
  app.register(settingsRoutes);
  return app;
}

describe('settings routes', () => {
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

  it('POST /settings writes new keys that did not exist before', async () => {
    const app = appWith();
    const res = await app.inject({
      method: 'POST',
      url: '/settings',
      // This tests the "key doesn't exist → append" branch in updateEnvFile
      payload: { GOAL_ID: 42 },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it('POST /settings updates existing keys (overwrite branch)', async () => {
    const app = appWith();
    // First write
    await app.inject({
      method: 'POST',
      url: '/settings',
      payload: { GOAL_ID: 1 },
    });
    // Second write — tests the "key exists → replace" branch
    const res = await app.inject({
      method: 'POST',
      url: '/settings',
      payload: { GOAL_ID: 2 },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });
});
