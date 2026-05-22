import { z } from 'zod';

/** Yandex OAuth (Yandex ID) base. Authorization-code flow — see https://yandex.ru/dev/id/doc/ru/. */
export const OAUTH_BASE_URL = 'https://oauth.yandex.ru';

/** Minimal fetch shape (injectable so the exchange is unit-testable without a network). */
export interface OAuthFetch {
  (
    url: string,
    init: { method: string; headers: Record<string, string>; body: string },
  ): Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;
}

export interface OAuthToken {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly refreshToken?: string;
}

const TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

/**
 * Build the authorization URL the user opens in a browser to approve access (response_type=code).
 * With the registered out-of-band redirect (oauth.yandex.ru/verification_code) Yandex shows the code
 * on screen to paste back. `redirectUri` is included only when given.
 */
export function authorizeUrl(clientId: string, redirectUri?: string): string {
  const params = new URLSearchParams({ response_type: 'code', client_id: clientId });
  if (redirectUri !== undefined) params.set('redirect_uri', redirectUri);
  return `${OAUTH_BASE_URL}/authorize?${params.toString()}`;
}

/**
 * Exchange a confirmation code for an OAuth token (POST /token, form-encoded). Throws on a non-2xx
 * response or a body that doesn't match the expected schema. Never logs the secret or token.
 */
export async function exchangeCodeForToken(
  doFetch: OAuthFetch,
  input: { code: string; clientId: string; clientSecret: string },
): Promise<OAuthToken> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
  }).toString();

  const res = await doFetch(`${OAUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OAuth token exchange failed (HTTP ${res.status}): ${raw}`);
  }
  const parsed = TokenResponseSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error('OAuth token response did not match the expected schema');
  }
  return {
    accessToken: parsed.data.access_token,
    tokenType: parsed.data.token_type,
    expiresIn: parsed.data.expires_in,
    refreshToken: parsed.data.refresh_token,
  };
}

/**
 * Set (or replace) a `KEY=value` line in a `.env` file's text, preserving the other lines. Pure so
 * the CLI's file write is trivial and the tricky bit is tested.
 */
export function upsertEnvVar(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  const sep = content.length === 0 || content.endsWith('\n') ? '' : '\n';
  return `${content}${sep}${line}\n`;
}
