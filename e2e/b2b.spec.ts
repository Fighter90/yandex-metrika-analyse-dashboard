import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('B2B pipeline CRUD', () => {
  test('lists seeded deals and the pipeline summary', async ({ page }) => {
    await installMocks(page);
    await page.goto('/b2b');
    await expect(page.getByRole('cell', { name: 'BigCorp', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'MidMarket', exact: true })).toBeVisible();
    await expect(page.getByText(/Всего билетов в пайплайне/)).toBeVisible();
  });

  test('adds a deal and it appears in the table', async ({ page }) => {
    await installMocks(page);
    await page.goto('/b2b');
    await page.getByLabel('Компания').fill('NewCo');
    await page.getByLabel('Билеты').fill('5');
    await page.getByLabel('Этап новой сделки').selectOption('negotiation');
    await page.getByRole('button', { name: 'Добавить' }).click();
    await expect(page.getByRole('cell', { name: 'NewCo', exact: true })).toBeVisible();
  });

  test('changes a deal stage', async ({ page }) => {
    await installMocks(page);
    await page.goto('/b2b');
    await page.getByLabel('Этап MidMarket').selectOption('paid');
    await expect(page.getByLabel('Этап MidMarket')).toHaveValue('paid');
  });

  test('removes a deal', async ({ page }) => {
    await installMocks(page);
    await page.goto('/b2b');
    await page.getByRole('button', { name: 'Удалить MidMarket' }).click();
    await expect(page.getByRole('cell', { name: 'MidMarket', exact: true })).toHaveCount(0);
    await expect(page.getByRole('cell', { name: 'BigCorp', exact: true })).toBeVisible();
  });
});
