import { expect, test } from '@playwright/test';

test('главная открывается и показывает заголовок', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'Радар' })).toBeVisible();
  await expect(page).toHaveTitle('Проверка стилей — Радар');
});

test('шрифт Styrene A LC загружен и применён', async ({ page }) => {
  await page.goto('/');
  // Приложение рисуется после старта моков: шрифты запрашиваются, только когда есть текст.
  const heading = page.getByRole('heading', { level: 1, name: 'Радар' });
  await expect(heading).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const loadedWeights = await page.evaluate(() =>
    [...document.fonts]
      .filter((face) => face.family.includes('Styrene A LC') && face.status === 'loaded')
      .map((face) => face.weight),
  );
  expect(loadedWeights).toEqual(expect.arrayContaining(['400', '500', '700']));
  await expect(heading).toHaveCSS('font-family', /^"Styrene A LC"/);
});

test('нет горизонтальной прокрутки', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Радар' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
