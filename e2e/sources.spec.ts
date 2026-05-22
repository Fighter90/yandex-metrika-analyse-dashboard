import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('Sources — «Откуда эта цифра?»', () => {
  test('looks up a raw response by id and shows the cached payload', async ({ page }) => {
    await installMocks(page);
    await page.goto('/sources');
    await expect(page.getByRole('heading', { name: 'Откуда эта цифра?' })).toBeVisible();
    await page.getByLabel('raw_response_id').fill('1');
    await page.getByRole('button', { name: 'Показать' }).click();
    await expect(page.getByText('/stat/v1/data')).toBeVisible();
    await expect(page.getByText('abc123')).toBeVisible();
  });

  test('shows a not-found message for a missing id', async ({ page }) => {
    await installMocks(page);
    await page.goto('/sources');
    await page.getByLabel('raw_response_id').fill('999');
    await page.getByRole('button', { name: 'Показать' }).click();
    await expect(page.getByText(/Ответ не найден/)).toBeVisible();
  });
});
