export type QueryStatus = 'pending' | 'error' | 'success';

/**
 * Combine two query statuses for a page that needs both: any error wins, then both must be success,
 * otherwise still pending. Pure so the branch matrix is unit-testable (see overview/funnel/traffic).
 */
export function combineStatus(a: QueryStatus, b: QueryStatus): QueryStatus {
  if (a === 'error' || b === 'error') return 'error';
  if (a === 'success' && b === 'success') return 'success';
  return 'pending';
}
