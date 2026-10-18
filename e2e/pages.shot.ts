import { expect, type Page, test } from '@playwright/test';

interface Shot {
  name: string;
  path: string;
  /** Что должно появиться на экране перед съёмкой. */
  ready: (page: Page) => Promise<void>;
}

const SHOTS: Shot[] = [
  {
    name: 'feed',
    path: '/',
    ready: (page) => expect(page.getByRole('article').first()).toBeVisible(),
  },
  {
    name: 'feed-empty',
    path: '/?q=несуществующее',
    ready: (page) => expect(page.getByText('Ничего не нашлось')).toBeVisible(),
  },
  {
    name: 'insight',
    path: '/insights/agro-flood',
    ready: (page) => expect(page.getByRole('region', { name: 'Источники' })).toBeVisible(),
  },
  {
    name: 'company',
    path: '/company',
    ready: (page) => expect(page.getByRole('region', { name: 'Факты о компании' })).toBeVisible(),
  },
  {
    name: 'notifications',
    path: '/notifications',
    ready: (page) => expect(page.getByRole('figure', { name: 'Пример уведомления' })).toBeVisible(),
  },
  {
    name: 'not-found',
    path: '/no-such-page',
    ready: (page) => expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
  },
  {
    name: 'error',
    path: '/?mock=errors',
    ready: (page) => expect(page.getByRole('button', { name: 'Повторить' })).toBeVisible(),
  },
];

for (const { name, path, ready } of SHOTS) {
  test(name, async ({ page }, info) => {
    await page.goto(path);
    await ready(page);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/screenshots/pages-${name}-${info.project.name}.png`,
      fullPage: true,
    });
  });
}
