import { describe, it, expect, vi } from 'vitest';
import {
  authorizeUrl,
  exchangeCodeForToken,
  upsertEnvVar,
  OAUTH_BASE_URL,
  type OAuthFetch,
} from '../../src/metrika/oauth';

function fakeFetch(res: {
  ok: boolean;
  status: number;
  body: string;
}): OAuthFetch & { calls: { url: string; init: unknown }[] } {
  const calls: { url: string; init: unknown }[] = [];
  const fn = vi.fn(async (url: string, init: unknown) => {
    calls.push({ url, init });
    return { ok: res.ok, status: res.status, text: async () => res.body };
  });
  return Object.assign(fn as unknown as OAuthFetch, { calls });
}

describe('authorizeUrl', () => {
  it('builds a response_type=code URL with the client id', () => {
    const url = authorizeUrl('CID');
    expect(url.startsWith(`${OAUTH_BASE_URL}/authorize?`)).toBe(true);
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=CID');
    expect(url).not.toContain('redirect_uri');
  });

  it('includes redirect_uri when provided', () => {
    const url = authorizeUrl('CID', 'https://oauth.yandex.ru/verification_code');
    expect(url).toContain('redirect_uri=https');
  });
});

describe('exchangeCodeForToken', () => {
  const input = { code: 'abc', clientId: 'CID', clientSecret: 'SECRET' };

  it('posts form-encoded params and maps a valid token response', async () => {
    const doFetch = fakeFetch({
      ok: true,
      status: 200,
      body: JSON.stringify({
        access_token: 'tok',
        token_type: 'bearer',
        expires_in: 31536000,
        refresh_token: 'ref',
      }),
    });
    const token = await exchangeCodeForToken(doFetch, input);
    expect(token).toEqual({
      accessToken: 'tok',
      tokenType: 'bearer',
      expiresIn: 31536000,
      refreshToken: 'ref',
    });
    const init = doFetch.calls[0]?.init as { method: string; body: string };
    expect(doFetch.calls[0]?.url).toBe(`${OAUTH_BASE_URL}/token`);
    expect(init.method).toBe('POST');
    expect(init.body).toContain('grant_type=authorization_code');
    expect(init.body).toContain('code=abc');
    expect(init.body).toContain('client_secret=SECRET');
  });

  it('omits refreshToken when absent', async () => {
    const doFetch = fakeFetch({
      ok: true,
      status: 200,
      body: JSON.stringify({ access_token: 'tok', token_type: 'bearer', expires_in: 100 }),
    });
    const token = await exchangeCodeForToken(doFetch, input);
    expect(token.refreshToken).toBeUndefined();
  });

  it('throws on a non-2xx response', async () => {
    const doFetch = fakeFetch({
      ok: false,
      status: 400,
      body: '{"error":"bad_verification_code"}',
    });
    await expect(exchangeCodeForToken(doFetch, input)).rejects.toThrow(/HTTP 400/);
  });

  it('throws when the body does not match the schema', async () => {
    const doFetch = fakeFetch({ ok: true, status: 200, body: '{"unexpected":true}' });
    await expect(exchangeCodeForToken(doFetch, input)).rejects.toThrow(/did not match/);
  });
});

describe('upsertEnvVar', () => {
  it('replaces an existing key in place, preserving other lines', () => {
    const content = 'A=1\nYANDEX_OAUTH_TOKEN=old\nB=2\n';
    expect(upsertEnvVar(content, 'YANDEX_OAUTH_TOKEN', 'new')).toBe(
      'A=1\nYANDEX_OAUTH_TOKEN=new\nB=2\n',
    );
  });

  it('appends a missing key (adding a separator when needed)', () => {
    expect(upsertEnvVar('A=1', 'TOKEN', 'x')).toBe('A=1\nTOKEN=x\n');
    expect(upsertEnvVar('A=1\n', 'TOKEN', 'x')).toBe('A=1\nTOKEN=x\n');
  });

  it('appends to empty content without a leading newline', () => {
    expect(upsertEnvVar('', 'TOKEN', 'x')).toBe('TOKEN=x\n');
  });
});
