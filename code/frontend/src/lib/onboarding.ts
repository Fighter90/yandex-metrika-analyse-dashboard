/** localStorage key marking that the first-visit onboarding card has been dismissed. */
export const ONBOARDED_KEY = 'pca.onboarded';

/**
 * True when the onboarding card should be shown — i.e. the user has not yet dismissed it. Reads a
 * single key from the provided storage; pure aside from the read.
 */
export function shouldShowOnboarding(store: Pick<Storage, 'getItem'>): boolean {
  return store.getItem(ONBOARDED_KEY) === null;
}

/** Persist that onboarding has been completed/dismissed so the card stays hidden afterwards. */
export function markOnboarded(store: Pick<Storage, 'setItem'>): void {
  store.setItem(ONBOARDED_KEY, '1');
}
