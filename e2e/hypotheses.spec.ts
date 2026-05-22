import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

/** Fill every field the shared Voronkova validation requires to enable save. */
async function fillValidHypothesis(page: import('@playwright/test').Page): Promise<void> {
  await page.getByLabel('Subject (ЦА)').fill('Слушатели подкаста');
  await page.getByLabel('Action').fill('оставляют заявку, но не платят');
  await page.getByLabel('Solution').fill('покупку билета');
  await page.getByLabel('Condition (если)').fill('оплата требует ручного счёта');
  await page.getByLabel('Title').fill('Подкаст-трафик без оплат');
  await page.getByLabel('Допущение: behavior').fill('Готов платить при оплате в 1 клик');
  await page.getByLabel('Допущение: market').fill('Аудитория платёжеспособна');
  await page.getByLabel('Допущение: tech').fill('Путь оплаты ломается на счёте');
  await page.getByLabel('Метод 1 план').fill('Сегментировать воронку по дням');
  await page.getByLabel('Метод 2 план').fill('Включить онлайн-оплату на 50%');
  await page.getByLabel('Impact rationale').fill('Крупнейший канал по визитам');
  await page.getByLabel('Confidence rationale').fill('Разрыв виден в данных');
  await page.getByLabel('Ease rationale').fill('Несколько дней интеграции');
  await page.getByLabel('🟢 Green').fill('CR в оплату +30%');
  await page.getByLabel('🟡 Yellow').fill('Рост 10–30%');
  await page.getByLabel('🔴 Red').fill('Рост <10%');
}

test.describe('Hypotheses — Voronkova editor', () => {
  test('blocks save and shows validation errors while the form is empty', async ({ page }) => {
    await installMocks(page);
    await page.goto('/hypotheses');
    await expect(page.getByRole('button', { name: 'Сохранить гипотезу' })).toBeDisabled();
    await expect(page.getByRole('list', { name: 'Ошибки валидации' })).toBeVisible();
    await expect(page.getByText('Гипотез пока нет.')).toBeVisible();
  });

  test('enables save once the full Voronkova format is filled, then creates the row', async ({
    page,
  }) => {
    await installMocks(page);
    await page.goto('/hypotheses');
    await fillValidHypothesis(page);
    const save = page.getByRole('button', { name: 'Сохранить гипотезу' });
    await expect(save).toBeEnabled();
    await expect(page.getByRole('list', { name: 'Ошибки валидации' })).toHaveCount(0);
    await save.click();
    await expect(page.getByRole('cell', { name: 'Подкаст-трафик без оплат' })).toBeVisible();
    // ICE badge: 5 × 5 × 5 = 125 by default.
    await expect(page.getByRole('cell', { name: '125', exact: true })).toBeVisible();
  });
});
