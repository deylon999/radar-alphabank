import { screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

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

const companySelect = () => screen.findByRole('combobox', { name: 'Компания' });

describe('оболочка приложения', () => {
  it('по умолчанию выбирает первую компанию и показывает её ленту', async () => {
    renderApp('/');

    expect(await companySelect()).toHaveDisplayValue('АО «Полевея Агро»');
    expect(
      await screen.findByRole('link', { name: /Паводок в Заречном районе/ }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(document.title).toBe('Лента — Радар');
    });
  });

  it('переключение компании меняет ленту и запоминается', async () => {
    const { user } = renderApp('/');
    await screen.findByRole('link', { name: /Паводок в Заречном районе/ });

    await user.selectOptions(await companySelect(), 'ООО «Кварталика»');

    expect(await screen.findByRole('link', { name: /Авария на подстанции/ })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Паводок в Заречном районе/ }),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY)).toBe('kvartalika');
  });

  it('восстанавливает сохранённую компанию после перезагрузки', async () => {
    window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, 'kalveta');
    renderApp('/company');

    expect(await companySelect()).toHaveDisplayValue('ООО «Кальвета»');
    expect(await screen.findByRole('heading', { name: 'ООО «Кальвета»' })).toBeInTheDocument();
  });

  it('игнорирует неизвестную сохранённую компанию', async () => {
    window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, 'deleted-company');
    renderApp('/');

    expect(await companySelect()).toHaveDisplayValue('АО «Полевея Агро»');
  });

  it('работает, когда localStorage недоступен', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const { user } = renderApp('/');

    await user.selectOptions(await companySelect(), 'ООО «Кальвета»');

    expect(await screen.findByRole('link', { name: /Цемент Озёрья/ })).toBeInTheDocument();
  });

  it('со страницы инсайта при смене компании уводит в ленту', async () => {
    const { user, router } = renderApp('/insights/agro-flood');
    expect(
      await screen.findByRole('heading', { level: 1, name: /Паводок в Заречном районе/ }),
    ).toBeInTheDocument();

    await user.selectOptions(await companySelect(), 'ООО «Кальвета»');

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

    expect(
      await screen.findByRole('link', { name: /Паводок в Заречном районе/ }),
    ).toBeInTheDocument();
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
