import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';

const PAGES = [
  { path: '/', title: 'Лента — Радар', heading: 'Лента' },
  { path: '/overview', title: 'Обзор — Радар', heading: 'Обзор' },
  { path: '/overview?view=bank', title: 'Обзор — Радар', heading: 'Обзор' },
  { path: '/quality', title: 'Качество выводов — Радар', heading: 'Качество выводов' },
  { path: '/company', title: 'Профиль компании — Радар', heading: 'Профиль компании' },
  { path: '/notifications', title: 'Уведомления — Радар', heading: 'Уведомления' },
  {
    path: '/insights/u9250-key-rate',
    title: /^ЦБ сохранил ставку 14%.* — Радар$/,
    heading: /ЦБ сохранил ставку 14%/,
  },
  { path: '/no-such-page', title: 'Страница не найдена — Радар', heading: 'Страница не найдена' },
] as const;

test.describe('компания пользователя', () => {
  test.use({ signedInAs: 'user-u1465' });

  test('у демо-аккаунта другой компании — её название и её лента, и так после перезагрузки', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Рубль слабеет: импортные вино/ })).toBeVisible();
    await expect(page.getByRole('banner')).toContainText('Клиент U_1465');

    await page.reload();

    await expect(page.getByRole('link', { name: /Рубль слабеет: импортные вино/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /ЦБ сохранил ставку 14%/ })).toHaveCount(0);
  });
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
  await expect(page.getByRole('heading', { level: 1, name: 'Профиль компании' })).toBeVisible();
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
  { path: '/?mock=errors', text: 'Не удалось загрузить компанию' },
  { path: '/?q=несуществующее', text: 'Ничего не нашлось' },
]) {
  test(`${path}: состояние без данных проходит axe`, async ({ page }) => {
    await page.goto(path);
    // Запросы с ошибкой повторяются с паузами — экран ошибки появляется не сразу.
    await expect(page.getByText(text)).toBeVisible({ timeout: 15_000 });

    const { violations } = await new AxeBuilder({ page }).analyze();
    const severe = violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(severe).toEqual([]);
  });
}

test.describe('без компании', () => {
  test.use({ signedInAs: 'user-newcomer' });

  test('экран подключения компании проходит axe и не прокручивается вбок', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Заявка отправлена' })).toBeVisible();
    await page.getByRole('button', { name: 'Отменить заявку' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Подключите компанию' }),
    ).toBeVisible();
    await page.getByLabel('Название, ID или ИНН').fill('клиент');
    await expect(page.getByRole('list', { name: 'Найденные компании' })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const { violations } = await new AxeBuilder({ page }).analyze();
    const severe = violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(severe).toEqual([]);
  });
});
