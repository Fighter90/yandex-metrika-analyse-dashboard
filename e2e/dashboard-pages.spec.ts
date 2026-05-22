import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('Read-only dashboard pages render their data', () => {
  test('Overview: KPI strip + weak spots + charts', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    await expect(page.getByText('Цель (платных билетов)')).toBeVisible();
    await expect(page.getByText(/Заявок/)).toBeVisible();
    await expect(page.getByText(/Слабые места/)).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('Traffic: channel chart + UTM table', async ({ page }) => {
    await installMocks(page);
    await page.goto('/traffic');
    await expect(page.getByText('Каналы — визиты')).toBeVisible();
    await expect(page.getByText('UTM-разбивка')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'podcast' })).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('Audience: country + device charts', async ({ page }) => {
    await installMocks(page);
    await page.goto('/audience');
    await expect(page.getByRole('heading', { name: 'Страна' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Устройство' })).toBeVisible();
    await expect(page.locator('canvas')).toHaveCount(2);
  });

  test('Behavior: entry + exit pages', async ({ page }) => {
    await installMocks(page);
    await page.goto('/behavior');
    await expect(page.getByRole('heading', { name: 'Страницы входа' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Страницы выхода' })).toBeVisible();
    await expect(page.getByText('/lp')).toBeVisible();
    await expect(page.getByText('/checkout')).toBeVisible();
  });

  test('Trends: daily time-series', async ({ page }) => {
    await installMocks(page);
    await page.goto('/trends');
    await expect(page.getByText('Динамика по дням')).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('Funnel: «заявка ≠ оплата» stages', async ({ page }) => {
    await installMocks(page);
    await page.goto('/funnel');
    await expect(page.getByText('Воронка конверсии')).toBeVisible();
    await expect(page.getByText('Оплачено B2B')).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });
});

test.describe('Pages surface an error state when the API fails', () => {
  test('Overview shows an error alert on a 500', async ({ page }) => {
    await installMocks(page, { errors: ['channels'] });
    await page.goto('/');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('Traffic shows an error alert on a 500', async ({ page }) => {
    await installMocks(page, { errors: ['channels', 'utm'] });
    await page.goto('/traffic');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('Audience shows an error alert on a 500', async ({ page }) => {
    await installMocks(page, { errors: ['geo-device'] });
    await page.goto('/audience');
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
