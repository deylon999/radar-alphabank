import { screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { DEMO_PASSWORD, DEMO_TOTP_ACCOUNT } from '../../shared/demoAccounts';
import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

const { server, store } = createMockServer({ session: {} });

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  store.reset();
});
afterAll(() => {
  server.close();
});

async function fillLogin(
  user: ReturnType<typeof renderApp>['user'],
  email: string,
  password: string,
) {
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Пароль'), password);
  await user.click(screen.getByRole('button', { name: 'Войти' }));
}

describe('вход', () => {
  it('без входа раздел ведёт на вход, а после входа — обратно в раздел', async () => {
    const { user, router } = renderApp('/company');

    await screen.findByRole('heading', { level: 1, name: 'Вход в Радар' });
    expect(router.state.location.search).toBe('?next=%2Fcompany');

    await fillLogin(user, 'u9250@demo.radar', DEMO_PASSWORD);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Профиль компании' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/company');
  });

  it('демо-аккаунт входит одной кнопкой', async () => {
    const { user } = renderApp('/login');

    await user.click(await screen.findByRole('button', { name: /Войти как u34911@demo\.radar/ }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Лента' })).toBeInTheDocument();
  });

  it('неверный пароль — понятная ошибка, без входа', async () => {
    const { user } = renderApp('/login');

    await fillLogin(user, 'u9250@demo.radar', 'не тот пароль');

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный email или пароль.');
    expect(store.session().userId).toBeUndefined();
  });

  it('с 2FA — второй шаг с кодом, неверный код не пускает', async () => {
    const { user } = renderApp('/login');
    await fillLogin(user, DEMO_TOTP_ACCOUNT.email, DEMO_PASSWORD);

    await screen.findByRole('heading', { level: 1, name: 'Подтверждение входа' });
    const code = screen.getByLabelText('Код');

    await user.type(code, '000000');
    await user.click(screen.getByRole('button', { name: 'Подтвердить' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Код не подошёл');

    await user.clear(code);
    await user.type(code, DEMO_TOTP_ACCOUNT.code);
    // Кнопка Alfa ещё немного показывает загрузку после ответа и в это время не нажимается.
    const confirm = screen.getByRole('button', { name: 'Подтвердить' });
    await waitFor(() => {
      expect(confirm).toBeEnabled();
    });
    await user.click(confirm);

    expect(await screen.findByRole('heading', { level: 1, name: 'Лента' })).toBeInTheDocument();
  });

  it('выход возвращает на вход, и данные прежнего пользователя недоступны', async () => {
    store.writeSession((session) => {
      session.userId = 'user-u9250';
    });
    const { user, router } = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Лента' });

    await user.click(screen.getByRole('button', { name: 'Выйти' }));

    await screen.findByRole('heading', { level: 1, name: 'Вход в Радар' });
    expect(router.state.location.pathname).toBe('/login');
    expect(store.session().userId).toBeUndefined();
  });

  it('сессия истекла посреди работы — на вход', async () => {
    store.writeSession((session) => {
      session.userId = 'user-u9250';
    });
    const { user } = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Лента' });

    store.writeSession((session) => {
      session.userId = undefined;
    });
    const [notifications] = screen.getAllByRole('link', { name: 'Уведомления' });
    if (!notifications) throw new Error('Нет ссылки на уведомления');
    await user.click(notifications);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Вход в Радар' }),
    ).toBeInTheDocument();
  });
});

describe('регистрация', () => {
  async function fillRegister(
    user: ReturnType<typeof renderApp>['user'],
    email: string,
    password: string,
  ) {
    await user.type(await screen.findByLabelText('Email'), email);
    await user.type(screen.getByLabelText('Пароль'), password);
    await user.click(screen.getByRole('button', { name: 'Зарегистрироваться' }));
  }

  it('короткий пароль — ошибка под полем, связанная с ним', async () => {
    const { user } = renderApp('/register');

    await fillRegister(user, 'new@example.com', 'короткий');

    const password = screen.getByLabelText('Пароль');
    await waitFor(() => {
      expect(password).toHaveAttribute('aria-invalid', 'true');
    });
    expect(password).toHaveAccessibleDescription('Пароль — от 15 символов.');
  });

  it('занятый email — подсказка войти', async () => {
    const { user } = renderApp('/register');

    await fillRegister(user, 'u9250@demo.radar', 'длинный пароль для проверки');

    expect(await screen.findByRole('alert')).toHaveTextContent('Этот email уже зарегистрирован');
  });

  it('после регистрации сразу вход', async () => {
    const { user } = renderApp('/register');

    await fillRegister(user, 'new@example.com', 'длинный пароль для проверки');

    // Новый пользователь ещё не в компании — сначала подключает её.
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Подключите компанию' }),
    ).toBeInTheDocument();
    expect(store.read().users.some((item) => item.email === 'new@example.com')).toBe(true);
    expect(within(document.body).getByRole('button', { name: 'Выйти' })).toHaveAttribute(
      'title',
      'Выйти (new@example.com)',
    );
  });
});
