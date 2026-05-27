// Mobile (iPhone 14) smoke: every page renders without horizontal overflow, and the hamburger
// menu opens and navigates. Runs only under the `mobile-iphone-14` Playwright project.
import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

const PAGES: ReadonlyArray<readonly [path: string, marker: RegExp]> = [
  ['/', /Цель|Дайджест/],
  ['/traffic', /Каналы/],
  ['/behavior', /Страницы входа/],
  ['/funnel', /Воронка/],
  ['/goals', /цел|Прогресс|Цели/i],
  ['/report', /Сформировать срез данных/],
  ['/history', /Отчётов пока нет|История/],
  ['/settings', /Настройки/],
  ['/help', /Справка/],
];

/** No element forces the page wider than the viewport (allow 1px rounding). */
async function expectNoHorizontalScroll(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('Mobile (iPhone 14) — no horizontal scroll on any page', () => {
  for (const [path, marker] of PAGES) {
    test(`${path} fits the viewport`, async ({ page }) => {
      await installMocks(page);
      await page.goto(path);
      // Scope to <main> so the marker matches page content, not the (hidden) desktop nav links.
      await expect(page.locator('main').getByText(marker).first()).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test('hamburger menu opens and navigates', async ({ page }) => {
    await installMocks(page);
    await page.goto('/');
    // Desktop nav links are hidden (lg:flex); the hamburger toggles the mobile menu.
    await page.getByRole('button', { name: /открыть меню/i }).click();
    const reportLink = page.getByRole('link', { name: 'Отчёт' });
    await expect(reportLink).toBeVisible();
    await reportLink.click();
    await expect(page).toHaveURL(/\/report$/);
  });
});
