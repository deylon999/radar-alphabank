import { screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { chooseClient, companyButton } from '../test/clientPicker';
import { createMockServer } from '../test/mockServer';
import { renderApp } from '../test/renderApp';
import { SELECTED_COMPANY_STORAGE_KEY } from './company/SelectedCompanyProvider';

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
  it('по умолчанию выбирает первую компанию и показывает её ленту', async () => {
    renderApp('/');

    expect(await companyButton()).toHaveAccessibleName('Компания: Клиент U_9250');
    expect(await screen.findByRole('link', { name: /ЦБ сохранил ставку 14%/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe('Лента — Радар');
    });
  });

  it('переключение компании меняет ленту и запоминается', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: /ЦБ сохранил ставку 14%/ });

    await chooseClient(user, 'Клиент U_1465');

    expect(
      await screen.findByRole('link', { name: /Рубль слабеет: импортные вино/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ЦБ сохранил ставку 14%/ })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY)).toBe('U_1465');
  });

  it('восстанавливает сохранённую компанию после перезагрузки', async () => {
    window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, 'U_34911');
    renderApp('/company');

    expect(await companyButton()).toHaveAccessibleName('Компания: Клиент U_34911');
    expect(await screen.findByRole('heading', { name: 'Клиент U_34911' })).toBeInTheDocument();
  });

  it('игнорирует неизвестную сохранённую компанию', async () => {
    window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, 'deleted-company');
    renderApp('/');

    expect(await companyButton()).toHaveAccessibleName('Компания: Клиент U_9250');
  });

  it('работает, когда localStorage недоступен', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const { user } = renderApp('/');

    await chooseClient(user, 'Клиент U_34911');

    expect(await screen.findByRole('link', { name: /Экспорт урожая буксует/ })).toBeInTheDocument();
  });

  it('со страницы инсайта при смене компании уводит в ленту', async () => {
    const { user, router } = renderApp('/insights/u9250-key-rate');
    expect(
      await screen.findByRole('heading', { level: 1, name: /ЦБ сохранил ставку 14%/ }),
    ).toBeInTheDocument();

    await chooseClient(user, 'Клиент U_34911');

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
  });

  it('показывает ошибку с «Повторить», если список компаний не загрузился', async () => {
    setErrorMode(true);
    const { user } = renderApp('/');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('Не удалось загрузить список компаний')).toBeInTheDocument();

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
