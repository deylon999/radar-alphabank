import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'dark' });

const pages = [
  { name: 'лента', path: '/', ready: 'article' },
  { name: 'карточка инсайта', path: '/insights/agro-flood', ready: 'heading' },
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
