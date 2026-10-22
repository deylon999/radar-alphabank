import { screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { NEWCOMER_ID } from '../../mocks/fixtures';
import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

const { server, store } = createMockServer({ session: { userId: NEWCOMER_ID } });

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  store.reset();
});
afterAll(() => {
  server.close();
});

describe('подключение компании', () => {
  it('заявка ждёт владельца — её можно отменить и подать в другую компанию', async () => {
    const { user } = renderApp('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Заявка отправлена' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Заявка в «Клиент U_9250» ждёт решения/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Отменить заявку' }));
    await screen.findByRole('heading', { level: 1, name: 'Подключите компанию' });

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ваша должность' }),
      'Главный бухгалтер',
    );
    await user.type(screen.getByLabelText('Название, ID или ИНН'), 'U_1465');
    const results = await screen.findByRole('list', { name: 'Найденные компании' });
    await user.click(
      within(results).getByRole('button', { name: 'Подать заявку в «Клиент U_1465»' }),
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Заявка отправлена' }),
    ).toBeInTheDocument();
    expect(store.read().joinRequests.at(-1)).toMatchObject({
      companyId: 'U_1465',
      status: 'pending',
      position: 'accountant',
    });
  });

  it('своя компания: неверный ИНН — подсказка, верный — сразу в Радар владельцем', async () => {
    store.write((db) => {
      db.joinRequests = [];
    });
    const { user } = renderApp('/company');

    await user.type(await screen.findByLabelText('Название компании'), 'ООО Ромашка');
    const inn = screen.getByLabelText('ИНН');
    await user.type(inn, '123');
    await user.click(screen.getByRole('button', { name: 'Создать компанию' }));
    await waitFor(() => {
      expect(inn).toHaveAttribute('aria-invalid', 'true');
    });

    await user.clear(inn);
    await user.type(inn, '7701234567');
    const create = screen.getByRole('button', { name: 'Создать компанию' });
    await waitFor(() => {
      expect(create).toBeEnabled();
    });
    await user.click(create);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Профиль компании' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('ООО Ромашка');
    expect(screen.getByText(/^Отрасль не указана · ИНН 7701234567$/)).toBeInTheDocument();
  });
});
