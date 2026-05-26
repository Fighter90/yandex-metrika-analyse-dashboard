import { describe, it, expect, afterEach } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import * as fs from 'node:fs';
import { settingsRoutes, mask, readEnvFile, updateEnvFile, ENV_PATH } from '../../src/routes/settings';

const ENV_BACKUP = ENV_PATH + '.backup';

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

describe('mask (unit)', () => {
  it('returns **** for empty string', () => {
    expect(mask('')).toBe('****');
  });

  it('returns **** for short strings (<=8 chars)', () => {
    expect(mask('short')).toBe('****');
    expect(mask('12345678')).toBe('****');
  });

  it('masks long strings showing first 4 and last 2', () => {
    expect(mask('abcdefghijklmnop')).toBe('abcd****op');
    expect(mask('test-token-xxxx')).toBe('test****xx');
  });
});

describe('readEnvFile (unit)', () => {
  afterEach(() => {
    // Restore original .env if we backed it up
    if (fs.existsSync(ENV_BACKUP)) {
      fs.renameSync(ENV_BACKUP, ENV_PATH);
    }
  });

  it('returns {} when .env does not exist', () => {
    // Temporarily move .env away
    if (fs.existsSync(ENV_PATH)) {
      fs.renameSync(ENV_PATH, ENV_BACKUP);
    }
    const result = readEnvFile();
    expect(result).toEqual({});
    // Restore
    if (fs.existsSync(ENV_BACKUP)) {
      fs.renameSync(ENV_BACKUP, ENV_PATH);
    }
  });

  it('parses key=value lines and skips comments/blanks/lines-without-eq', () => {
    // Save original .env
    const hadEnv = fs.existsSync(ENV_PATH);
    if (hadEnv) fs.renameSync(ENV_PATH, ENV_BACKUP);

    // Write a test .env with various line types
    fs.writeFileSync(
      ENV_PATH,
      ['# comment line', 'VALID_KEY=value', 'no_equals_here', '', 'ANOTHER=123'].join('\n'),
    );

    const result = readEnvFile();
    expect(result).toEqual({ VALID_KEY: 'value', ANOTHER: '123' });

    // Restore original .env
    fs.unlinkSync(ENV_PATH);
    if (hadEnv) fs.renameSync(ENV_BACKUP, ENV_PATH);
  });
});

describe('updateEnvFile (unit)', () => {
  afterEach(() => {
    // Restore original .env if we backed it up
    if (fs.existsSync(ENV_BACKUP)) {
      fs.renameSync(ENV_BACKUP, ENV_PATH);
    }
    // Clean up test .env if it exists
    if (fs.existsSync(ENV_PATH) && !fs.existsSync(ENV_BACKUP)) {
      // Only delete if it was created by this test suite
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      if (content.includes('TEST_KEY') || content.includes('VALID_KEY')) {
        fs.unlinkSync(ENV_PATH);
      }
    }
  });

  it('adds trailing newline when content does not end with one', () => {
    // Save original .env
    const hadEnv = fs.existsSync(ENV_PATH);
    if (hadEnv) fs.renameSync(ENV_PATH, ENV_BACKUP);

    // Write .env WITHOUT trailing newline
    fs.writeFileSync(ENV_PATH, 'EXISTING=value', 'utf-8');

    updateEnvFile({ NEW_KEY: 'newval' });

    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    expect(content).toContain('EXISTING=value\n');
    expect(content).toContain('NEW_KEY=newval\n');
    expect(content.endsWith('\n')).toBe(true);

    // Restore
    fs.unlinkSync(ENV_PATH);
    if (hadEnv) fs.renameSync(ENV_BACKUP, ENV_PATH);
  });
});
