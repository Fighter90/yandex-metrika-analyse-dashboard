export type QueryStatus = 'pending' | 'error' | 'success';

/**
 * Combine N query statuses for a page that needs all of them: any error wins, then all must be
 * success, otherwise still pending. Pure so the branch matrix is unit-testable.
 */
export function combineStatus(...statuses: QueryStatus[]): QueryStatus {
  if (statuses.some((s) => s === 'error')) return 'error';
  if (statuses.every((s) => s === 'success')) return 'success';
  return 'pending';
}
