// B2B page removed (v2.7.0) — manual B2B entry moved into Settings. /b2b redirects to /settings.
import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('B2B input lives in Settings', () => {
  test('/b2b redirects to /settings', async ({ page }) => {
    await installMocks(page);
    await page.goto('/b2b');
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('Settings exposes the collapsible B2B pipeline section', async ({ page }) => {
    await installMocks(page);
    await page.goto('/settings');
    await expect(page.getByText('B2B-пайплайн (ручной ввод сделок)')).toBeVisible();
  });

  test('nav no longer shows a B2B link', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'B2B' })).toHaveCount(0);
  });
});
