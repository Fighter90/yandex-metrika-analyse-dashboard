import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

test.describe('Report — snapshot, on-screen render, export, AI', () => {
  test('builds a snapshot and renders the full report on screen', async ({ page }) => {
    await installMocks(page);
    await page.goto('/report');
    await page.getByRole('button', { name: 'Сформировать срез данных' }).click();
    await expect(page.getByText(/Срез данных: snap-e2e/).first()).toBeVisible();

    const full = page.getByRole('article', { name: 'Полный отчёт' });
    await expect(full).toBeVisible();
    // The on-screen report carries the same sections as the exported DOCX/PDF.
    await expect(full.getByRole('heading', { name: 'Краткие итоги' })).toBeVisible();
    await expect(
      full.getByRole('heading', { name: 'Воронка: визит → заявка → оплата' }),
    ).toBeVisible();
    await expect(full.getByRole('heading', { name: 'Каналы: трафик и конверсия' })).toBeVisible();
    await expect(full.getByRole('heading', { name: 'Глоссарий и принципы' })).toBeVisible();
    await expect(full.getByRole('heading', { name: 'Приложение с данными' })).toBeVisible();
  });

  test('exports DOCX and PDF and generates the AI analysis', async ({ page }) => {
    await installMocks(page);
    await page.goto('/report');
    await page.getByRole('button', { name: 'Сформировать срез данных' }).click();
    await expect(page.getByText(/Срез данных: snap-e2e/).first()).toBeVisible();

    const [docx] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export DOCX' }).click(),
    ]);
    expect(docx.suggestedFilename()).toBe('productcamp-report-snap-e2e.docx');

    const [pdf] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export PDF' }).click(),
    ]);
    expect(pdf.suggestedFilename()).toBe('productcamp-report-snap-e2e.pdf');

    await page.getByRole('button', { name: 'Сгенерировать AI-анализ' }).click();
    await expect(page.getByText(/AI-анализ: визиты растут/)).toBeVisible();
  });
});
