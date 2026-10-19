import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const PAGES = [
  { path: '/', title: 'Лента — Радар', heading: 'Лента' },
  { path: '/company', title: 'Профиль компании — Радар', heading: 'Профиль компании' },
  { path: '/notifications', title: 'Уведомления — Радар', heading: 'Уведомления' },
  {
    path: '/insights/u9250-key-rate',
    title: /^ЦБ сохранил ставку 14%.* — Радар$/,
    heading: /ЦБ сохранил ставку 14%/,
  },
  { path: '/no-such-page', title: 'Страница не найдена — Радар', heading: 'Страница не найдена' },
] as const;

const companyButton = (page: Page) => page.getByRole('button', { name: /^Компания: / });

/** Выбор клиента: кнопка в шапке открывает панель с поиском. */
async function chooseCompany(page: Page, name: string) {
  await companyButton(page).click();
  await page
    .getByRole('dialog', { name: 'Выбор клиента' })
    .getByRole('button', { name: new RegExp(`^${name}(?!\\d)`) })
    .click();
}

async function expectCompany(page: Page, name: string) {
  await expect(companyButton(page)).toHaveAccessibleName(`Компания: ${name}`);
}

test('выбранная компания переживает перезагрузку', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /ЦБ сохранил ставку 14%/ })).toBeVisible();

  await chooseCompany(page, 'Клиент U_1465');
  await expect(page.getByRole('link', { name: /Рубль слабеет: импортные вино/ })).toBeVisible();

  await page.reload();

  await expectCompany(page, 'Клиент U_1465');
  await expect(page.getByRole('link', { name: /Рубль слабеет: импортные вино/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /ЦБ сохранил ставку 14%/ })).toHaveCount(0);
});

test('разделы открываются из навигации, активный отмечен', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Основная навигация' }).locator('visible=true');

  await nav.getByRole('link', { name: 'Уведомления' }).click();

  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Уведомления' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Уведомления' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('навигация работает с клавиатуры', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Лента' })).toBeVisible();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Перейти к содержимому' })).toBeFocused();

  const profileLink = page
    .getByRole('navigation', { name: 'Основная навигация' })
    .locator('visible=true')
    .getByRole('link', { name: 'Профиль компании' });
  await profileLink.focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/company$/);
  // Enter открывает поиск, стрелка ведёт к результату, Enter выбирает — фокус на кнопке.
  await companyButton(page).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.type('зерн');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: /^Клиент U_9250/ }),
  ).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(companyButton(page)).toBeFocused();
  await expectCompany(page, 'Клиент U_34911');
  await expect(page.getByRole('heading', { name: 'Клиент U_34911' })).toBeVisible();
});

for (const { path, title, heading } of PAGES) {
  test(`${path}: заголовок вкладки, нет горизонтальной прокрутки, нет нарушений axe`, async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page).toHaveTitle(title);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    const { violations } = await new AxeBuilder({ page }).analyze();
    const severe = violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(severe).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}

for (const { path, text } of [
  { path: '/?mock=errors', text: 'Не удалось загрузить список компаний' },
  { path: '/?q=несуществующее', text: 'Ничего не нашлось' },
]) {
  test(`${path}: состояние без данных проходит axe`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText(text)).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).analyze();
    const severe = violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(severe).toEqual([]);
  });
}

test('открытый выбор клиента проходит axe и помещается в экран', async ({ page }) => {
  await page.goto('/');
  await companyButton(page).click();
  const picker = page.getByRole('dialog', { name: 'Выбор клиента' });
  await expect(picker.getByRole('list', { name: 'Клиенты' })).toBeVisible();

  const box = await picker.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box && box.x >= 0 && box.x + box.width <= width).toBe(true);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const severe = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
  expect(severe).toEqual([]);
});
