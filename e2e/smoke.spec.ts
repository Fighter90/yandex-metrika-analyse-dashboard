import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

/**
 * Cross-page navigation journey: the shell boots and every nav link reaches a page that renders.
 * Per-feature interaction depth (CRUD, form gating, report, error states) lives in the focused
 * specs (b2b/hypotheses/decisions/report/sources/filters/dashboard-pages). Backend is mocked via
 * the shared fixtures, so this is deterministic and needs no OAuth token.
 */
test('dashboard shell renders nav and every page is reachable', async ({ page }) => {
  await installMocks(page);
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
  await expect(page.getByLabel('Сегмент')).toBeVisible();
  await expect(page.getByText('Цель (платных билетов)')).toBeVisible();
  await expect(page.locator('canvas').first()).toBeVisible();

  for (const [name, marker] of [
    ['Traffic', 'Каналы — визиты'],
    ['Audience', 'Страна'],
    ['Behavior', 'Страницы входа'],
    ['Trends', 'Динамика по дням'],
    ['Funnel', 'Воронка конверсии'],
  ] as const) {
    await page.getByRole('link', { name }).click();
    await expect(page.getByText(marker).first()).toBeVisible();
  }

  await page.getByRole('link', { name: 'B2B' }).click();
  await expect(page.getByRole('button', { name: 'Добавить' })).toBeVisible();

  await page.getByRole('link', { name: 'Hypotheses' }).click();
  await expect(page.getByRole('button', { name: 'Сгенерировать гипотезы' })).toBeEnabled();

  await page.getByRole('link', { name: 'Decisions' }).click();
  await expect(page.getByRole('button', { name: /Сохранить решение/ })).toBeDisabled();

  await page.getByRole('link', { name: 'Report' }).click();
  await expect(page.getByRole('button', { name: 'Сформировать snapshot' })).toBeVisible();

  await page.getByRole('link', { name: 'История' }).click();
  await expect(page.getByText(/Отчётов пока нет|Всего отчётов/)).toBeVisible();

  await page.getByRole('link', { name: 'Настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
});
