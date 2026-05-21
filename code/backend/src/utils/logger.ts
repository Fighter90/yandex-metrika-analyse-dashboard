import pino from 'pino';

/** App logger. Redacts the OAuth token / auth header so secrets never reach logs. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
  redact: {
    paths: ['token', 'headers.authorization', '*.token', '*.authorization'],
    censor: '[redacted]',
  },
});
