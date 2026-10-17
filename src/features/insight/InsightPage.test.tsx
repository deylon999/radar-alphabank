import { render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { insights } from '../../mocks/fixtures';
import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';
import { Consequence } from './Consequence/Consequence';

const { server, store } = createMockServer();

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

const FLOOD = 'Паводок в Заречном районе: вода подошла к складской зоне';

async function openInsight(id: string) {
  const app = renderApp(`/insights/${id}`);
  await screen.findByRole('heading', { level: 1 });
  return app;
}

describe('правила продукта', () => {
  it.each(insights.map((insight) => [insight.id, insight] as const))(
    '%s: последствие подписано «Гипотеза» и пояснено',
    (_, insight) => {
      render(<Consequence insight={insight} />);
      const section = screen.getByRole('region', { name: 'Возможное последствие' });

      expect(within(section).getByText('Гипотеза')).toBeInTheDocument();
      expect(section.textContent).toContain(insight.consequence);
      expect(section).toHaveTextContent('Это предположение системы, а не установленный факт');
    },
  );

  it('ни на одной карточке нет оценок вероятности и уверенности', async () => {
    for (const insight of insights) {
      const { unmount } = await openInsight(insight.id);
      const text = document.body.textContent;

      expect(text).not.toMatch(/вероятност|уверенност|достоверност|probability|confidence/i);
      unmount();
    }
  });
});

describe('карточка инсайта', () => {
  it('показывает разделы в порядке ТЗ', async () => {
    await openInsight('agro-flood');

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Что случилось',
      'Почему это касается вас',
      'Возможное последствие',
      'Основания',
      'Что неизвестно',
      'Источники',
      'История изменений',
      'Что проверить',
      'Обратная связь',
    ]);
  });

  it('при открытии помечает инсайт прочитанным', async () => {
    await openInsight('agro-flood');

    await waitFor(() => {
      expect(store.read().insights.find((item) => item.id === 'agro-flood')?.status).toBe('read');
    });
  });

  it('цепочка подписывает роль каждого шага и заканчивается компанией', async () => {
    await openInsight('agro-flood');
    const section = screen.getByRole('region', { name: 'Почему это касается вас' });
    const steps = within(section).getAllByRole('listitem');

    expect(steps.map((step) => step.textContent)).toEqual([
      'СобытиеПаводок в Заречном районе',
      'ПлощадкаСклад «Южный-2»',
      'ПоставкаПоставка упаковки',
      'Ваша компанияПолевея Агро',
    ]);
  });

  it('источники открываются в новой вкладке безопасно', async () => {
    await openInsight('agro-flood');
    const links = within(screen.getByRole('region', { name: 'Источники' })).getAllByRole('link');

    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAccessibleName(/откроется в новой вкладке/);
    }
  });

  it('чек-лист считает отмеченное и помнит его после повторного открытия', async () => {
    const { user, unmount } = await openInsight('agro-flood');
    const section = screen.getByRole('region', { name: 'Что проверить' });
    expect(section).toHaveTextContent('0 из 3');

    await user.click(within(section).getAllByRole('checkbox')[0] ?? section);

    expect(section).toHaveTextContent('1 из 3');
    unmount();
    await openInsight('agro-flood');
    expect(screen.getByRole('region', { name: 'Что проверить' })).toHaveTextContent('1 из 3');
  });

  it('отзыв уходит одним нажатием, комментарий — по желанию', async () => {
    const { user } = await openInsight('agro-flood');
    const section = screen.getByRole('region', { name: 'Обратная связь' });

    await user.click(within(section).getByRole('button', { name: 'Полезно' }));
    expect(await within(section).findByText('Спасибо, отзыв учтён.')).toBeInTheDocument();
    expect(within(section).getByRole('button', { name: 'Полезно' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.type(within(section).getByRole('textbox'), 'Нужна карта затопления');
    await user.click(within(section).getByRole('button', { name: 'Добавить комментарий' }));

    expect(await within(section).findByText('Спасибо, комментарий получен.')).toBeInTheDocument();
    expect(store.read().feedback).toEqual([
      { insightId: 'agro-flood', useful: true },
      { insightId: 'agro-flood', useful: true, comment: 'Нужна карта затопления' },
    ]);
  });

  it('несуществующий инсайт — понятное сообщение и путь в ленту', async () => {
    renderApp('/insights/missing');

    expect(await screen.findByText('Инсайт не найден')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Открыть ленту' })).toHaveAttribute('href', '/');
  });

  it('«Лента» в крошках возвращает к ленте с теми же фильтрами', async () => {
    const { user, router } = renderApp('/?kind=risk&urgency=urgent');
    await user.click(await screen.findByRole('link', { name: FLOOD }));
    await screen.findByRole('heading', { level: 1, name: FLOOD });

    const crumbs = screen.getByRole('navigation', { name: 'Хлебные крошки' });
    const feedLink = within(crumbs).getByRole('link', { name: 'Лента' });
    expect(feedLink).toHaveAttribute('href', '/?kind=risk&urgency=urgent');
    await user.click(feedLink);

    await waitFor(() => {
      expect(router.state.location.search).toBe('?kind=risk&urgency=urgent');
    });
    expect(router.state.historyAction).toBe('POP');
  });
});
