/** Extract a display message from an unknown error (e.g. a react-query mutation error), or undefined. */
export function errorMessage(err: unknown): string | undefined {
  return err ? (err as Error).message : undefined;
}
