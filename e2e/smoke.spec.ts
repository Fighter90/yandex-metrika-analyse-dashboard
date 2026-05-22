import { test, expect } from '@playwright/test';

/**
 * Acceptance (Iteration 4): the dashboard shell boots locally and the Overview page renders
 * KPI + charts from channel data. The backend is mocked at the network layer so the e2e is
 * deterministic and needs no OAuth token. Later iterations extend this (hypothesis gating,
 * report generation — §12.4).
 */
test('dashboard shell renders nav + Overview KPI', async ({ page }) => {
  await page.route('**/api/metrics/channels*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          date: '2025-01-01',
          channel: 'podcast',
          utmSource: null,
          utmMedium: null,
          utmCampaign: null,
          visits: 100,
          users: 90,
          bounceRate: 0.2,
          avgDuration: 60,
          goalReaches: 5,
          conversionRate: 0.05,
        },
      ]),
    }),
  );
  await page.route('**/api/b2b', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/hypotheses', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/decisions', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/report/snapshot', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'snap-e2e',
        generatedAt: 'T',
        period: { from: '2025-01-01', to: '2025-01-07' },
        kpi: { target: 300, b2cApplications: 7, b2bPaidTickets: 20, gap: 280 },
        channels: [],
        hypotheses: { problems: [], solutions: [] },
        decisions: [],
      }),
    }),
  );
  await page.route('**/api/report/generate', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as { format?: string };
    const ext = body.format === 'pdf' ? 'pdf' : 'docx';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ filePath: `data/reports/snap-e2e.${ext}` }),
    });
  });

  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Hypotheses' })).toBeVisible();
  await expect(page.getByLabel('Сегмент')).toBeVisible();
  await expect(page.getByText('Цель (платных билетов)')).toBeVisible();
  await expect(page.getByText(/Заявок/)).toBeVisible();

  // Navigate to the Traffic page (same channel data) and confirm it renders.
  await page.getByRole('link', { name: 'Traffic' }).click();
  await expect(page.getByText('Каналы — визиты')).toBeVisible();

  // Navigate to the B2B page and confirm the CRUD form is present.
  await page.getByRole('link', { name: 'B2B' }).click();
  await expect(page.getByRole('button', { name: 'Добавить' })).toBeVisible();

  // Navigate to Hypotheses and confirm the Voronkova editor blocks save while empty.
  await page.getByRole('link', { name: 'Hypotheses' }).click();
  await expect(page.getByRole('button', { name: /Сохранить гипотезу/ })).toBeDisabled();

  // Navigate to Decisions and confirm the Decision Log editor blocks save while empty.
  await page.getByRole('link', { name: 'Decisions' }).click();
  await expect(page.getByRole('button', { name: /Сохранить решение/ })).toBeDisabled();

  // Report: build a snapshot, then export DOCX (both backend calls mocked).
  await page.getByRole('link', { name: 'Report' }).click();
  await page.getByRole('button', { name: 'Сформировать snapshot' }).click();
  await expect(page.getByText(/snapshot snap-e2e/)).toBeVisible();
  await page.getByRole('button', { name: 'Export DOCX' }).click();
  await expect(page.getByText(/Сохранено: data\/reports\/snap-e2e\.docx/)).toBeVisible();
  await page.getByRole('button', { name: 'Export PDF' }).click();
  await expect(page.getByText(/Сохранено: data\/reports\/snap-e2e\.pdf/)).toBeVisible();
});
