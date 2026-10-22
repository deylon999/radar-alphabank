import AxeBuilder from '@axe-core/playwright';

import { expect, type Page, test } from './fixtures';

test.use({ signedInAs: null });

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
}

test('без входа — на вход, демо-аккаунт возвращает в нужный раздел', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page).toHaveURL(/\/login\?next=%2Fnotifications$/);
  await expect(page).toHaveTitle('Вход — Радар');
  expect(await seriousViolations(page)).toEqual([]);

  await page.getByRole('button', { name: /Войти как u26030@demo\.radar/ }).click();

  await expect(page).toHaveURL(/\/notifications$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Уведомления' })).toBeVisible();
});

test('2FA: поле кода получает фокус, верный код впускает', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('cfo@demo.radar');
  await page.getByLabel('Пароль').fill('radar-demo-2026!');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Подтверждение входа' })).toBeVisible();
  await expect(page.getByLabel('Код', { exact: true })).toBeFocused();
  await page.getByLabel('Код', { exact: true }).fill('123456');
  await page.getByRole('button', { name: 'Подтвердить' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Лента' })).toBeVisible();
});

test('регистрация: ошибка под полем, без прокрутки вбок и нарушений axe', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Email').fill('new@example.com');
  await page.getByLabel('Пароль').fill('короткий');
  await page.getByRole('button', { name: 'Зарегистрироваться' }).click();

  await expect(page.getByLabel('Пароль')).toHaveAttribute('aria-invalid', 'true');
  // Кнопка Alfa ещё немного показывает загрузку — проверяем доступность итогового экрана.
  await expect(page.getByRole('button', { name: 'Зарегистрироваться' })).toBeEnabled();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await seriousViolations(page)).toEqual([]);
});

test('выход: после него разделы снова требуют вход', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /Войти как u9250@demo\.radar/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Лента' })).toBeVisible();

  await page.getByRole('button', { name: 'Выйти' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/company');
  await expect(page).toHaveURL(/\/login\?next=%2Fcompany$/);
});
