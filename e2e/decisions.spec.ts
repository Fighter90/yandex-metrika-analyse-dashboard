import { test, expect } from '@playwright/test';
import { installMocks } from './fixtures';

const SEED_HYP = {
  id: 1,
  diamondPhase: 'define',
  kind: 'problem',
  subject: 'Слушатели',
  action: 'не платят',
  solution: 'билет',
  condition: 'нет онлайн-оплаты',
  title: 'Подкаст-трафик без оплат',
  hiddenAssumptions: [],
  validationMethods: [],
  impact: 8,
  confidence: 6,
  ease: 7,
  impactRationale: 'r',
  confidenceRationale: 'r',
  easeRationale: 'r',
  iceScore: 336,
  greenCriteria: 'g',
  yellowCriteria: 'y',
  redCriteria: 'r',
  deadlineDays: 5,
  deadlineAt: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  status: 'in_progress',
  createdAt: 'c',
  updatedAt: 'u',
};

test.describe('Decisions — Decision Log editor', () => {
  test('blocks save until a hypothesis, evidence and the next step are provided', async ({
    page,
  }) => {
    await installMocks(page, { hypotheses: [SEED_HYP] });
    await page.goto('/decisions');
    await expect(page.getByText('Решений пока нет.')).toBeVisible();
    const save = page.getByRole('button', { name: 'Сохранить решение' });
    await expect(save).toBeDisabled();
  });

  test('creates a decision once the form is complete', async ({ page }) => {
    await installMocks(page, { hypotheses: [SEED_HYP] });
    await page.goto('/decisions');
    await page.getByLabel('Гипотеза').selectOption('1');
    await page.getByLabel('Объём (scope)').fill('A/B на podcast, 2 недели');
    await page.getByLabel('Вывод').fill('Онлайн-оплата подняла конверсию на 24%');
    await page.getByLabel('Цитата').fill('Платёж прошёл за 10 секунд');
    await page.getByLabel('Источник').fill('CustDev, респондент 2');
    await page.getByLabel('Исход', { exact: true }).selectOption('yellow');
    await page.getByLabel('Обоснование исхода').fill('Рост в жёлтой зоне 10–30%');
    await page.getByLabel('Следующий шаг').fill('Упростить ввод карты');
    await page.getByLabel('Кто решил').fill('Команда трека');
    const save = page.getByRole('button', { name: 'Сохранить решение' });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByText('DL-001')).toBeVisible();
    await expect(page.getByText('Упростить ввод карты')).toBeVisible();
  });
});
