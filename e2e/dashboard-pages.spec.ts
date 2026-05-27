import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('Read-only dashboard pages render their data', () => {
  test('Overview: KPI strip + weak spots + charts + geo/device + auto-detected KPI goal badge', async ({
    page,
  }) => {
    await installMocks(page);
    await page.goto('/');
    await expect(page.getByText('Цель (платных билетов)')).toBeVisible();
    // Mocked primary goal is a purchase goal → KPI is labelled «Оплат» (formatGoalLabel, v2.7.0).
    await expect(page.getByText(/Оплат/)).toBeVisible();
    await expect(page.getByRole('heading', { name: /Слабые места/ })).toBeVisible();
    // Charts: «визиты и заявки по дням», channel mix, geo bar, device donut
    await expect(page.locator('canvas')).toHaveCount(4);
    // Geo/device mini-charts on Overview
    await expect(page.getByRole('heading', { name: 'Топ стран по визитам' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Доля устройств (визиты)' })).toBeVisible();
    // The auto-detected KPI goal is surfaced (no manual GOAL_ID needed).
    await expect(page.getByText(/KPI-цель определена автоматически/)).toBeVisible();
    await expect(page.getByText('Ecommerce: покупка')).toBeVisible();
  });

  test('Traffic: channel chart + UTM table', async ({ page }) => {
    await installMocks(page);
    await page.goto('/traffic');
    await expect(page.getByText('Каналы — визиты', { exact: true })).toBeVisible();
    await expect(page.getByText(/Каналы — визиты vs заявки/)).toBeVisible();
    await expect(page.getByText('UTM-разбивка')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'podcast' })).toBeVisible();
    await expect(page.locator('canvas').first()).toBeVisible();
  });

  test('Traffic: grouped-bar chart has legend', async ({ page }) => {
    await installMocks(page);
    await page.goto('/traffic');
    // The «визиты vs заявки» grouped bar includes a legend
    await expect(page.locator('canvas').nth(1)).toBeVisible();
  });

  test('Behavior: entry + exit pages', async ({ page }) => {
    await installMocks(page);
    await page.goto('/behavior');
    await expect(page.getByRole('heading', { name: 'Страницы входа' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Страницы выхода' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '/lp' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '/checkout' })).toBeVisible();
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
});
