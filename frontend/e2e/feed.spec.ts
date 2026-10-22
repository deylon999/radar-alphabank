import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from './fixtures';

const FLOOD = 'ЦБ сохранил ставку 14% и ужесточил риторику: кредиты не подешевеют до конца года';
const cards = (page: Page) => page.getByRole('article');

/** На телефоне и планшете фильтры свёрнуты — раскрываем их, если кнопка видна. */
async function openFilters(page: Page) {
  const toggle = page.getByRole('button', { name: /^Фильтры/ });
  if (await toggle.isVisible()) {
    await toggle.click();
  }
}

test('отфильтровал возможности, открыл карточку, вернулся с теми же фильтрами', async ({
  page,
}) => {
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible();

  await openFilters(page);
  await page.getByRole('button', { name: 'Возможность', exact: true, pressed: false }).click();
  await expect(page).toHaveURL(/\?kind=opportunity$/);
  await expect(page.getByRole('link', { name: FLOOD })).toHaveCount(0);

  const subsidy = page.getByRole('link', { name: /Флоатеры остаются главным способом/ });
  await subsidy.click();
  await expect(page).toHaveURL(/\/insights\/u9250-bonds$/);
  await expect(page.getByRole('heading', { level: 1, name: /Флоатеры/ })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\?kind=opportunity$/);
  await expect(
    page.getByRole('link', { name: /Флоатеры остаются главным способом/ }),
  ).toBeVisible();
});

test('срочный риск — первым, с красной полосой и меткой «Срочно»', async ({ page }) => {
  await page.goto('/');

  const first = cards(page).first();
  await expect(first.getByRole('link')).toHaveAccessibleName(FLOOD);
  await expect(first.getByText('Срочно')).toBeVisible();
  await expect(first).toHaveCSS('box-shadow', /inset/);
});

test('клик по сводке включает фильтр', async ({ page }) => {
  await page.goto('/?tab=watch');
  await expect(cards(page).first()).toBeVisible();

  await page.getByRole('button', { name: /срочный риск/ }).click();

  await expect(page).toHaveURL(/\?kind=risk&urgency=urgent$/);
  await expect(page.getByRole('tab', { name: 'Главное' })).toHaveAttribute('aria-selected', 'true');
  await expect(cards(page)).toHaveCount(1);
});

test('«Скрыть» убирает карточку, «Отменить» возвращает', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: FLOOD })).toBeVisible();

  await page.getByRole('button', { name: `Скрыть: ${FLOOD}` }).click();
  await expect(page.getByRole('link', { name: FLOOD })).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Скрыто' })).toBeVisible();

  await page.getByRole('button', { name: 'Отменить' }).click();
  await expect(page.getByRole('link', { name: FLOOD })).toBeVisible();
});

test('«Показать ещё» подгружает следующую страницу', async ({ page }) => {
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible();
  const before = await cards(page).count();

  await page.getByRole('button', { name: 'Показать ещё' }).click();

  await expect.poll(() => cards(page).count()).toBeGreaterThan(before);
});

test('лента с открытыми фильтрами: нет нарушений axe и горизонтальной прокрутки', async ({
  page,
}) => {
  await page.goto('/');
  await expect(cards(page).first()).toBeVisible();
  await openFilters(page);

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
