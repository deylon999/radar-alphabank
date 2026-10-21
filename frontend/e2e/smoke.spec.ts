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

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ЦБ сохранил ставку/);
  await expect(page.getByRole('region', { name: 'Что проверить' })).toContainText('0 из 3');
  await expect(page.getByRole('region', { name: 'Возможное последствие' })).toContainText(
    'Гипотеза',
  );
});

test('вход из Альфа-Бизнеса: виджет на главной → срочный инсайт → лента Радара', async ({
  page,
}) => {
  await page.goto('/business');
  await expect(page).toHaveTitle('Альфа-Бизнес — Радар');
  const widget = page.getByRole('region', { name: 'Радар' });
  await expect(widget).toContainText(/С\s\d+\s\S+:\s1\sсрочный\sриск/);

  await widget.getByRole('link', { name: /ЦБ сохранил ставку 14%/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/ЦБ сохранил ставку/);

  await page.goto('/business');
  await page.getByRole('link', { name: 'Открыть Радар' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Лента' })).toBeVisible();
});

test('обзор: разрезы по темам и по материалам банка, возврат из инсайта', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Основная навигация' })
    .locator('visible=true')
    .getByRole('link', { name: 'Обзор' })
    .click();

  const first = page.getByRole('region').first();
  await expect(first.getByRole('heading', { level: 2 })).toHaveText('Ставка и кредиты');

  await page.getByRole('tab', { name: 'По материалам банка' }).click();
  await expect(page).toHaveURL(/\/overview\?view=bank$/);
  await expect(page.getByRole('region').last()).toContainText('Материал устарел');

  await page
    .getByRole('link', { name: /ЦБ сохранил ставку 14%/ })
    .first()
    .click();
  await page
    .getByRole('navigation', { name: 'Хлебные крошки' })
    .getByRole('link', { name: 'Обзор' })
    .click();
  await expect(page).toHaveURL(/\/overview\?view=bank$/);
  await expect(page.getByRole('tab', { name: 'По материалам банка' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
