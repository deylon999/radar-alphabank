import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { companies } from '../../mocks/fixtures';
import { companyButton } from '../../test/clientPicker';
import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';
import { SELECTED_COMPANY_STORAGE_KEY } from './SelectedCompanyProvider';

const { server, store } = createMockServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  store.reset();
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const dialog = () => screen.getByRole('dialog', { name: 'Выбор клиента' });
const resultNames = () =>
  within(within(dialog()).getByRole('list', { name: 'Клиенты' }))
    .getAllByRole('button')
    .map((button) => button.textContent);

async function openPicker() {
  const app = renderApp('/');
  await screen.findByRole('link', { name: /ЦБ сохранил ставку 14%/ });
  await app.user.click(await companyButton());
  await within(dialog()).findByRole('list', { name: 'Клиенты' });
  return app;
}

describe('выбор клиента', () => {
  it('без запроса — крупнейшие клиенты по выручке, выбранный отмечен', async () => {
    await openPicker();

    expect(resultNames()).toEqual([
      'Клиент U_9250Строительство инженерных сооружений · Иркутская область',
      'Клиент U_26030Оптовая торговля моторным топливом · Республика Башкортостан',
      'Клиент U_34911Оптовая торговля зерном · Ростовская область',
      'Клиент U_1465Оптовая торговля напитками · Москва',
    ]);
    expect(within(dialog()).getByRole('button', { name: /^Клиент U_9250/ })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(within(dialog()).getByRole('searchbox', { name: 'Поиск клиента' })).toHaveFocus();
  });

  it('ищет по отрасли, коду ОКВЭД, региону и ID', async () => {
    const { user } = await openPicker();
    const search = within(dialog()).getByRole('searchbox', { name: 'Поиск клиента' });

    for (const [query, id] of [
      ['зерн', 'U_34911'],
      ['46.71', 'U_26030'],
      ['москва', 'U_1465'],
      ['u_9250', 'U_9250'],
    ] as const) {
      await user.clear(search);
      await user.type(search, query);
      await waitFor(() => {
        expect(resultNames()).toEqual([expect.stringMatching(new RegExp(`^Клиент ${id}(?!\\d)`))]);
      });
    }
  });

  it('пустой результат объясняет, что искать', async () => {
    const { user } = await openPicker();

    await user.type(within(dialog()).getByRole('searchbox'), 'металлургия');

    await waitFor(() => {
      expect(within(dialog()).getByRole('status')).toHaveTextContent(
        'Ничего не нашлось. Попробуйте ID, код ОКВЭД или регион',
      );
    });
    expect(within(dialog()).queryByRole('list', { name: 'Клиенты' })).toBeNull();
  });

  it('с клавиатуры: стрелка к результатам, Enter выбирает, Esc возвращает фокус', async () => {
    const { user } = await openPicker();

    await user.type(within(dialog()).getByRole('searchbox'), 'напитк');
    await waitFor(() => {
      expect(resultNames()).toHaveLength(1);
    });
    await user.keyboard('{ArrowDown}');
    expect(within(dialog()).getByRole('button', { name: /^Клиент U_1465/ })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await companyButton()).toHaveAccessibleName('Компания: Клиент U_1465');
    expect(await companyButton()).toHaveFocus();
    expect(window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY)).toBe('U_1465');

    await user.keyboard('{Enter}');
    expect(dialog()).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await companyButton()).toHaveFocus();
  });

  it('клиент, найденный поиском вне первых результатов, загружается после перезагрузки', async () => {
    // Список по умолчанию — только первый клиент; выбранный раньше U_1465 в него не попал.
    server.use(
      http.get('*/api/companies', ({ request }) =>
        new URL(request.url).searchParams.has('q') ? undefined : HttpResponse.json([companies[0]]),
      ),
    );
    window.localStorage.setItem(SELECTED_COMPANY_STORAGE_KEY, 'U_1465');
    renderApp('/');

    expect(await companyButton()).toHaveAccessibleName('Компания: Клиент U_1465');
    expect(
      await screen.findByRole('link', { name: /Рубль слабеет: импортные вино/ }),
    ).toBeInTheDocument();
  });
});
