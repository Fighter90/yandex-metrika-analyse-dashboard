import { test, expect } from '@playwright/test';

/**
 * Acceptance (Iteration 0): the app boots locally and surfaces backend health.
 * Backend is mocked at the network layer so the e2e is deterministic and
 * requires no OAuth token. Later iterations extend this with page coverage,
 * hypothesis-validation gating and report generation (§12.4).
 */
test('skeleton renders and shows backend health', async ({ page }) => {
  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', counterId: 54280963, metrikaTokenPresent: false }),
    }),
  );

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Conversion Analytics Dashboard/ })).toBeVisible();
  await expect(page.getByText('300+ платных билетов')).toBeVisible();
  await expect(page.getByText('ok')).toBeVisible();
  await expect(page.getByText('54280963')).toBeVisible();
  await expect(page.getByText(/не задан/)).toBeVisible();
});
