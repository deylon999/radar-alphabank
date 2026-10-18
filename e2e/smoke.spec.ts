import { expect, test } from '@playwright/test';

test('главная открывается: шапка, лента и заголовок вкладки', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Радар' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Лента' })).toBeVisible();
  await expect(page).toHaveTitle('Лента — Радар');
});

test('шрифт Styrene A LC загружен и применён', async ({ page }) => {
  await page.goto('/');
  // Приложение рисуется после старта моков: шрифты запрашиваются, только когда есть текст.
  const heading = page.getByRole('heading', { level: 1, name: 'Лента' });
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

test('главный сценарий: со старта один клик до срочного риска и того, что проверить', async ({
  page,
}) => {
  await page.goto('/');
  const first = page.getByRole('article').first();
  await expect(first).toContainText('Срочно');
  await expect(first).toContainText('Риск');

  await first.getByRole('link').click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Паводок/);
  await expect(page.getByRole('region', { name: 'Что проверить' })).toContainText('0 из 3');
  await expect(page.getByRole('region', { name: 'Возможное последствие' })).toContainText(
    'Гипотеза',
  );
});
