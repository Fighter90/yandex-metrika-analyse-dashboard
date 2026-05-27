// Methodology pages removed (v2.7.0) — hypotheses & decisions are AI-generated inside the Report.
// Stale URLs must redirect to /report.
import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('Removed methodology pages redirect to /report', () => {
  for (const path of ['/hypotheses', '/decisions']) {
    test(`${path} → /report`, async ({ page }) => {
      await installMocks(page);
      await page.goto(path);
      await expect(page).toHaveURL(/\/report$/);
      await expect(page.getByRole('button', { name: 'Сформировать срез данных' })).toBeVisible();
    });
  }

  test('nav no longer shows Гипотезы / Решения', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Гипотезы' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Решения' })).toHaveCount(0);
  });
});
