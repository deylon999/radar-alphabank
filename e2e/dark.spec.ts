import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'dark' });

const pages = [
  { name: 'лента', path: '/', ready: 'article' },
  { name: 'карточка инсайта', path: '/insights/u9250-key-rate', ready: 'heading' },
  { name: 'профиль компании', path: '/company', ready: 'heading' },
  { name: 'уведомления', path: '/notifications', ready: 'heading' },
] as const;

for (const { name, path, ready } of pages) {
  test(`тёмная тема: ${name} — тёмный фон и контраст без нарушений`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole(ready).first()).toBeVisible();

    // Фон тёмной темы Альфы, а не белый: тему не перебивают стили компонентов.
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(18, 18, 19)');
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations).toEqual([]);
  });
}

test.describe('переключатель в шапке', () => {
  test.use({ colorScheme: 'light' });

  test('включает тёмную тему, помнит её после перезагрузки и возвращает светлую', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('article').first()).toBeVisible();
    const body = page.locator('body');
    const toggle = page.getByRole('button', { name: 'Тёмная тема' });
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(body).toHaveCSS('background-color', 'rgb(18, 18, 19)');

    await page.reload();
    await expect(body).toHaveCSS('background-color', 'rgb(18, 18, 19)');

    await toggle.click();
    await expect(body).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });
});
