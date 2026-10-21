import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const region = (page: Page, name: string) => page.getByRole('region', { name });

test('лента → карточка → отметить пункт → отзыв → назад с теми же фильтрами', async ({ page }) => {
  await page.goto('/?kind=risk');
  await expect(page.getByRole('article').first()).toBeVisible();

  await page.getByRole('link', { name: /Рубль слабеет к юаню/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Рубль слабеет к юаню/ })).toBeVisible();
  await expect(page).toHaveTitle(/Рубль слабеет к юаню.* — Радар/);

  const checks = region(page, 'Что проверить');
  await expect(checks).toContainText('0 из 2');
  // Нативный checkbox в библиотеке визуально скрыт — нажимаем на подпись, как человек.
  await checks.locator('label').first().click();
  await expect(checks.getByRole('checkbox').first()).toBeChecked();
  await expect(checks).toContainText('1 из 2');

  const feedback = region(page, 'Обратная связь');
  await feedback.getByRole('button', { name: 'Полезно', exact: true }).click();
  await expect(feedback.getByText('Спасибо, отзыв учтён.')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Хлебные крошки' })
    .getByRole('link', { name: 'Лента' })
    .click();
  await expect(page).toHaveURL(/\/\?kind=risk$/);
  // На телефоне панель фильтров свёрнута, поэтому ищем и среди скрытых элементов.
  await expect(
    page.getByRole('button', { name: 'Риск', pressed: true, includeHidden: true }),
  ).toBeAttached();
  // Карточка прочитана — метки «Новое» у неё больше нет.
  const card = page.getByRole('article').filter({ hasText: 'Рубль слабеет к юаню' });
  await expect(card.getByText('Новое')).toHaveCount(0);
});

test('возврат кнопкой «Назад» сохраняет позицию прокрутки ленты', async ({ page }) => {
  // Невысокое окно: лента у клиента короткая, а проверить нужно возврат к прокрутке.
  await page.setViewportSize({ width: page.viewportSize()?.width ?? 1280, height: 600 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Показать ещё' }).click();
  const target = page.getByRole('link', { name: /Флоатеры остаются главным способом/ });
  await target.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);

  await target.click();
  await expect(
    page.getByRole('heading', { level: 1, name: /Флоатеры остаются главным способом/ }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(scrollBefore);

  await page.goBack();
  await expect(
    page.getByRole('link', { name: /Флоатеры остаются главным способом/ }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore - 50);
});

test('гипотеза визуально отличается от фактов', async ({ page }) => {
  await page.goto('/insights/u9250-key-rate');
  const hypothesis = region(page, 'Возможное последствие');
  await expect(hypothesis.getByText('Гипотеза')).toBeVisible();

  const hypothesisBorder = await hypothesis
    .getByText('Гипотеза')
    .locator('..')
    .evaluate((el) => getComputedStyle(el).borderTopStyle);
  const factsBorder = await region(page, 'Основания')
    .getByRole('list')
    .evaluate((el) => getComputedStyle(el).borderTopStyle);
  expect(hypothesisBorder).toBe('dashed');
  expect(factsBorder).toBe('solid');
});

test('карточка с открытой формой комментария: нет нарушений axe и прокрутки вбок', async ({
  page,
}) => {
  await page.goto('/insights/u9250-key-rate');
  await region(page, 'Обратная связь').getByRole('button', { name: 'Не полезно' }).click();
  await expect(page.getByRole('textbox', { name: /Комментарий/ })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(
    violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`),
  ).toEqual([]);
});

test('вопрос агенту: шаги видны по ходу, у ответа — «Как агент искал ответ», axe чисто', async ({
  page,
}) => {
  await page.goto('/insights/u9250-key-rate');
  const ask = page.getByRole('region', { name: 'Задать вопрос' });

  await ask.getByRole('button', { name: 'Что будет при ставке 12%?' }).click();

  await expect(ask.getByRole('status')).toHaveText('Агент готовит ответ — обычно до 30 секунд');
  await expect(
    ask.getByRole('list', { name: 'Шаги агента' }).getByRole('listitem').first(),
  ).toContainText('План');
  const { violations } = await new AxeBuilder({ page }).include('section').analyze();
  expect(
    violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    ),
  ).toEqual([]);

  const answers = ask.getByRole('list', { name: 'Ответы' });
  await expect(answers).toContainText('Позиция Альфа-Банка');
  await expect(answers.getByText(/^Как агент искал ответ · 5\sшагов$/)).toBeVisible();
  await expect(ask.getByRole('status')).toHaveCount(0);
});
