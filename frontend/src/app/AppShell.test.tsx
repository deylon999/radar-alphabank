import { screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';

const { server, store, setErrorMode } = createMockServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  store.reset();
  setErrorMode(false);
});
afterAll(() => {
  server.close();
});

describe('оболочка приложения', () => {
  it('в шапке — компания пользователя, лента — её', async () => {
    renderApp('/');

    expect(await screen.findByRole('link', { name: /ЦБ сохранил ставку 14%/ })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Клиент U_9250');
  });

  it('другой пользователь видит свою компанию, а не чужую', async () => {
    store.writeSession((session) => {
      session.userId = 'user-u1465';
    });
    renderApp('/');

    expect(
      await screen.findByRole('link', { name: /Рубль слабеет: импортные вино/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('Клиент U_1465');
    expect(screen.queryByRole('link', { name: /ЦБ сохранил ставку 14%/ })).toBeNull();
  });

  it('показывает ошибку с «Повторить», если компания не загрузилась', async () => {
    setErrorMode(true);
    const { user } = renderApp('/');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить компанию')).toBeInTheDocument();

    setErrorMode(false);
    await user.click(within(alert).getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('link', { name: /ЦБ сохранил ставку 14%/ })).toBeInTheDocument();
  });

  it('на неизвестном адресе показывает страницу 404 со ссылкой в ленту', async () => {
    renderApp('/no-such-page');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Страница не найдена' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть ленту' })).toHaveAttribute('href', '/');
  });

  it('отмечает активный раздел в навигации', async () => {
    renderApp('/notifications');

    const nav = (await screen.findAllByRole('navigation', { name: 'Основная навигация' }))[0];
    expect(nav).toBeDefined();
    expect(within(nav ?? document.body).getByRole('link', { name: 'Уведомления' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
