import { expect, type Page, test } from './fixtures';

const API_URL = 'http://localhost:8000';

/** Запрос из страницы — как его делает приложение: Service Worker MSW перехватывает fetch. */
async function fetchFromPage(page: Page, path: string) {
  return page.evaluate(async (url) => {
    const response = await fetch(url);
    return { status: response.status, body: (await response.json()) as unknown };
  }, `${API_URL}${path}`);
}

/**
 * Моки готовы, когда приложение получило первый ответ от них. Одного Service Worker мало:
 * после перезагрузки он есть сразу, а MSW в странице включается чуть позже, и запрос,
 * отправленный в этот промежуток, уходит мимо моков.
 */
async function waitForMocks(page: Page, navigate: () => Promise<unknown>) {
  const firstMockResponse = page.waitForResponse((response) =>
    response.url().includes('/api/companies'),
  );
  await navigate();
  await firstMockResponse;
}

test('моки отвечают в браузере без ошибок в консоли', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  await waitForMocks(page, () => page.goto('/'));
  const companies = await fetchFromPage(page, '/api/companies?q=клиент');

  expect(companies.status).toBe(200);
  expect((companies.body as { companies: unknown[] }).companies).toHaveLength(4);
  expect(consoleErrors).toEqual([]);
});

test('параметр ?mock=errors включает режим ошибок', async ({ page }) => {
  await waitForMocks(page, () => page.goto('/?mock=errors'));

  const response = await fetchFromPage(page, '/api/companies/U_9250');

  expect(response.status).toBe(500);
});

test('состояние моков переживает перезагрузку вкладки', async ({ page }) => {
  await waitForMocks(page, () => page.goto('/'));
  await page.evaluate(async (url) => {
    // Изменяющий запрос — с CSRF-токеном, как у приложения.
    const csrf = (await (await fetch(`${url}/api/auth/csrf`)).json()) as {
      token: string;
      headerName: string;
    };
    await fetch(`${url}/api/insights/u9250-key-rate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
      body: JSON.stringify({ status: 'read' }),
    });
  }, API_URL);

  await waitForMocks(page, () => page.reload());
  const insight = await fetchFromPage(page, '/api/insights/u9250-key-rate');

  expect(insight.body).toMatchObject({ id: 'u9250-key-rate', status: 'read' });
});

test('с моками запросы идут на адрес самого сайта, а не на localhost:8000', async ({ page }) => {
  const apiHosts = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      apiHosts.add(url.origin);
    }
  });

  await page.goto('/');
  await expect(page.getByRole('article').first()).toBeVisible();

  expect([...apiHosts]).toEqual([new URL(page.url()).origin]);
});

test('лента грузится, когда браузер усыпил Service Worker фоновой вкладки', async ({ page }) => {
  await page.goto('/notifications');
  await expect(page.getByRole('figure', { name: 'Пример уведомления' })).toBeVisible();

  // Проснувшись, Service Worker не помнит страницу и пропускает её запросы в сеть.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('ServiceWorker.enable');
  await cdp.send('ServiceWorker.stopAllWorkers');

  await page.getByRole('link', { name: 'Лента' }).first().click();

  await expect(page.getByRole('article').first()).toBeVisible();
  await expect(page.getByText(/Не удалось загрузить/)).toHaveCount(0);
});

test.describe('браузер без Service Worker', () => {
  // Так ведут себя встроенные браузеры мессенджеров и приватный режим Firefox.
  test.use({ serviceWorkers: 'block' });

  test('вместо вечной загрузки — понятная ошибка', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Не удалось проверить вход')).toBeVisible();
    await expect(page.getByText(/Демо-данные не запустились в этом браузере/)).toBeVisible();
  });
});
