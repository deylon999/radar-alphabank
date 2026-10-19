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

const companySelect = (page: Page) => page.getByRole('combobox', { name: 'Компания' });
const companyMenuButton = (page: Page) => page.getByRole('button', { name: /^Компания: / });

/** С мышью переключатель — меню, на сенсорном экране — системный список. */
async function usesMenu(page: Page): Promise<boolean> {
  await expect(companyMenuButton(page).or(companySelect(page))).toBeVisible();
  return companyMenuButton(page).isVisible();
}

async function chooseCompany(page: Page, name: string) {
  if (await usesMenu(page)) {
    await companyMenuButton(page).click();
    await page.getByRole('menuitemradio', { name }).click();
  } else {
    await companySelect(page).selectOption({ label: name });
  }
}

async function expectCompany(page: Page, name: string) {
  if (await usesMenu(page)) {
    await expect(companyMenuButton(page)).toHaveAccessibleName(`Компания: ${name}`);
  } else {
    await expect(companySelect(page).locator('option:checked')).toHaveText(name);
  }
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
  if (await usesMenu(page)) {
    // Стрелка открывает меню на выбранной компании, вторая — переходит к следующей.
    await companyMenuButton(page).focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(companyMenuButton(page)).toBeFocused();
  } else {
    await companySelect(page).focus();
    await page.keyboard.press('ArrowDown');
  }
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

test('открытое меню компаний проходит axe', async ({ page }) => {
  await page.goto('/');
  test.skip(!(await usesMenu(page)), 'на сенсорном экране вместо меню системный список');

  await companyMenuButton(page).click();
  await expect(page.getByRole('menu', { name: 'Компания' })).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).analyze();
  const severe = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
  expect(severe).toEqual([]);
});
