import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';

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

async function openNotifications() {
  const app = renderApp('/notifications');
  await screen.findByRole('region', { name: 'Telegram' });
  return app;
}

const telegram = () => screen.getByRole('region', { name: 'Telegram' });

describe('Telegram', () => {
  it('подключить → ссылка на бота → проверить → имя пользователя → отключить', async () => {
    const { user } = await openNotifications();
    expect(telegram()).toHaveTextContent('Не подключён');

    await user.click(within(telegram()).getByRole('button', { name: 'Подключить Telegram' }));

    const open = await within(telegram()).findByRole('link', { name: /Открыть Telegram/ });
    expect(open).toHaveAttribute('href', 'https://example.com/telegram-demo');
    expect(open).toHaveAttribute('target', '_blank');
    expect(open).toHaveAttribute('rel', 'noopener noreferrer');
    expect(open).toHaveAccessibleName(/откроется в новой вкладке/);

    await user.click(within(telegram()).getByRole('button', { name: 'Скопировать ссылку' }));
    expect(await screen.findByText('Ссылка скопирована')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe('https://example.com/telegram-demo');

    await user.click(within(telegram()).getByRole('button', { name: 'Проверить подключение' }));
    expect(await within(telegram()).findByText('@demo_director')).toBeInTheDocument();
    expect(await screen.findByText('Telegram подключён')).toBeInTheDocument();

    await user.click(within(telegram()).getByRole('button', { name: 'Отключить' }));
    expect(await within(telegram()).findByText('Не подключён')).toBeInTheDocument();
    await waitFor(() => {
      expect(store.read().notifications.telegram.connected).toBe(false);
    });
  });

  it('не удалось получить ссылку — понятная ошибка, кнопка остаётся', async () => {
    server.use(
      http.post('*/api/notifications/telegram/link', () => HttpResponse.json({}, { status: 500 })),
    );
    const { user } = await openNotifications();

    await user.click(within(telegram()).getByRole('button', { name: 'Подключить Telegram' }));

    expect(await within(telegram()).findByRole('alert')).toHaveTextContent(
      'Не удалось получить ссылку',
    );
    expect(within(telegram()).getByRole('button', { name: 'Подключить Telegram' })).toBeEnabled();
  });
});

describe('правила', () => {
  it('изменение сохраняется сразу', async () => {
    const { user } = await openNotifications();

    await user.click(screen.getByRole('radio', { name: 'Раз в неделю' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Время сводки' }), '18:30');
    await user.click(screen.getByRole('checkbox', { name: 'Возможности' }));

    await waitFor(() => {
      expect(store.read().notifications).toMatchObject({
        digest: 'weekly',
        digestTime: '18:30',
        urgentKinds: ['risk', 'opportunity'],
      });
    });
    expect(screen.getByText('Сохранено')).toBeInTheDocument();
  });

  it('сервер не принял — настройка видна сразу, а потом откатывается', async () => {
    server.use(
      http.put('*/api/notifications/settings', async () => {
        await delay(50);
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user } = await openNotifications();
    const opportunities = screen.getByRole('checkbox', { name: 'Возможности' });

    await user.click(opportunities);
    expect(opportunities).toBeChecked();

    expect(
      await screen.findByText('Не удалось сохранить. Вернули прежнюю настройку'),
    ).toBeInTheDocument();
    expect(opportunities).not.toBeChecked();
    expect(store.read().notifications.urgentKinds).toEqual(['risk']);
  });

  it('без сводки время выбрать нельзя', async () => {
    const { user } = await openNotifications();
    const time = screen.getByRole('combobox', { name: 'Время сводки' });
    expect(time).toBeEnabled();

    await user.click(screen.getByRole('radio', { name: 'Не присылать' }));

    expect(time).toBeDisabled();
  });

  it('не грузятся настройки — ошибка и «Повторить»', async () => {
    server.use(
      http.get('*/api/notifications/settings', () => HttpResponse.json({}, { status: 500 }), {
        once: true,
      }),
    );
    const { user } = renderApp('/notifications');

    expect(
      await screen.findByText('Не удалось загрузить настройки уведомлений'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('region', { name: 'Telegram' })).toBeInTheDocument();
  });
});

describe('превью уведомления', () => {
  const preview = () => screen.getByRole('region', { name: 'Так будет выглядеть уведомление' });

  it('показывает срочный инсайт компании без оценок вероятности', async () => {
    await openNotifications();

    const message = await within(preview()).findByRole('figure', { name: 'Пример уведомления' });
    expect(message).toHaveTextContent('Радар · Срочно · Риск');
    expect(message).toHaveTextContent('Паводок в Заречном районе');
    expect(message).toHaveTextContent('Что проверить:');
    expect(message.textContent).not.toMatch(/вероятност|уверенност|%/i);
  });

  it('если срочное не присылать — так и говорит', async () => {
    const { user } = await openNotifications();
    await within(preview()).findByRole('figure');

    await user.click(screen.getByRole('checkbox', { name: 'Риски' }));

    expect(within(preview()).getByText(/Срочные уведомления выключены/)).toBeInTheDocument();
    expect(within(preview()).queryByRole('figure')).toBeNull();
  });
});
