import { createHash } from 'node:crypto';

/** Deterministic SHA-1 of a JSON-serializable value — used to key cached raw responses. */
export function stableHash(value: unknown): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex');
}
