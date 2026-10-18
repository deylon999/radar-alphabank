import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const telegram = (page: Page) => page.getByRole('region', { name: 'Telegram' });

/** Нативный radio в библиотеке визуально скрыт — нажимаем на подпись, как человек. */
async function chooseRadio(page: Page, name: string) {
  await page.locator('label').filter({ hasText: name }).click();
  await expect(page.getByRole('radio', { name })).toBeChecked();
}

test('изменил сводку, перезагрузил — настройка сохранилась', async ({ page }) => {
  await page.goto('/notifications');

  await chooseRadio(page, 'Раз в неделю');
  await page.getByRole('combobox', { name: 'Время сводки' }).selectOption('18:30');
  await expect(page.getByText('Сохранено')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Раз в неделю' })).toBeChecked();
  await expect(page.getByRole('combobox', { name: 'Время сводки' })).toHaveValue('18:30');
});

test('подключение Telegram: ссылка на бота, возврат во вкладку, отключение', async ({ page }) => {
  await page.goto('/notifications');
  await telegram(page).getByRole('button', { name: 'Подключить Telegram' }).click();

  const open = telegram(page).getByRole('link', { name: /Открыть Telegram/ });
  await expect(open).toHaveAttribute('href', 'https://example.com/telegram-demo');

  const { violations } = await new AxeBuilder({ page }).analyze();
  const severe = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
  expect(severe).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Пользователь вернулся из Telegram: вкладка снова в фокусе — статус перезапрашивается.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(telegram(page).getByText('@demo_director')).toBeVisible();

  await telegram(page).getByRole('button', { name: 'Отключить' }).click();
  await expect(telegram(page).getByText('Не подключён')).toBeVisible();
});

test('превью показывает срочный риск компании', async ({ page }) => {
  await page.goto('/notifications');
  const message = page.getByRole('figure', { name: 'Пример уведомления' });
  await expect(message).toContainText('Радар · Срочно · Риск');
  await expect(message).toContainText('Паводок в Заречном районе');
});
