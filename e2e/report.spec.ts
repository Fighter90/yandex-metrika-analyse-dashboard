import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('Report — snapshot, on-screen render, export, AI', () => {
  test('builds a snapshot and renders the full report on screen', async ({ page }) => {
    await installMocks(page);
    await page.goto('/report');
    await page.getByRole('button', { name: 'Сформировать snapshot' }).click();
    await expect(page.getByText(/snapshot snap-e2e/)).toBeVisible();

    const full = page.getByRole('article', { name: 'Полный отчёт' });
    await expect(full).toBeVisible();
    // The on-screen report carries the same sections as the exported DOCX/PDF.
    await expect(full.getByRole('heading', { name: 'Executive Summary' })).toBeVisible();
    await expect(
      full.getByRole('heading', { name: 'Воронка: визит → заявка → оплата' }),
    ).toBeVisible();
    await expect(full.getByRole('heading', { name: 'Анализ по каналам' })).toBeVisible();
    await expect(full.getByRole('heading', { name: 'Глоссарий и принципы' })).toBeVisible();
    await expect(full.getByRole('heading', { name: 'Data Appendix' })).toBeVisible();
  });

  test('exports DOCX and PDF and generates the AI analysis', async ({ page }) => {
    await installMocks(page);
    await page.goto('/report');
    await page.getByRole('button', { name: 'Сформировать snapshot' }).click();
    await expect(page.getByText(/snapshot snap-e2e/)).toBeVisible();

    await page.getByRole('button', { name: 'Export DOCX' }).click();
    await expect(page.getByText(/Сохранено: data\/reports\/snap-e2e\.docx/)).toBeVisible();
    await page.getByRole('button', { name: 'Export PDF' }).click();
    await expect(page.getByText(/Сохранено: data\/reports\/snap-e2e\.pdf/)).toBeVisible();

    await page.getByRole('button', { name: 'Сгенерировать AI-анализ' }).click();
    await expect(page.getByText(/AI-анализ: визиты растут/)).toBeVisible();
  });
});
