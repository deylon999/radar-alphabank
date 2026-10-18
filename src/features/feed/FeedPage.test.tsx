import { screen, waitFor, within } from '@testing-library/react';
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
});
afterAll(() => {
  server.close();
});

const cardTitles = () =>
  screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent);
const filterTag = (name: string) => screen.getByRole('button', { name, pressed: false });
const search = (router: ReturnType<typeof renderApp>['router']) =>
  new URLSearchParams(router.state.location.search);

async function openFeed(path = '/') {
  const app = renderApp(path);
  await screen.findAllByRole('article');
  return app;
}

describe('лента: фильтры ↔ адрес', () => {
  it('фильтр «Возможность» попадает в адрес и оставляет только возможности', async () => {
    const { user, router } = await openFeed();

    await user.click(filterTag('Возможность'));

    await waitFor(() => {
      expect(search(router).getAll('kind')).toEqual(['opportunity']);
    });
    await waitFor(() => {
      for (const card of screen.getAllByRole('article')) {
        expect(within(card).getAllByText('Возможность').length).toBeGreaterThan(0);
      }
    });
    expect(screen.getByRole('button', { name: 'Возможность', pressed: true })).toBeInTheDocument();
  });

  it('фильтры из адреса применяются при открытии страницы', async () => {
    await openFeed('/?kind=risk&urgency=urgent');

    expect(screen.getByRole('button', { name: 'Риск', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Срочно', pressed: true })).toBeInTheDocument();
    expect(cardTitles()).toEqual(['Паводок в Заречном районе: вода подошла к складской зоне']);
  });

  it('«Сбросить» очищает фильтры и адрес', async () => {
    const { user, router } = await openFeed('/?kind=opportunity&stage=decided');

    await user.click(screen.getByRole('button', { name: 'Сбросить' }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('');
    });
    expect(screen.getByRole('button', { name: 'Сбросить' })).toBeDisabled();
  });

  it('поиск попадает в адрес после паузы в наборе', async () => {
    const { user, router } = await openFeed();

    await user.type(screen.getByRole('textbox', { name: 'Поиск по ленте' }), 'Южный');

    await waitFor(() => {
      expect(search(router).get('q')).toBe('Южный');
    });
    await waitFor(() => {
      expect(cardTitles()).toEqual(['Паводок в Заречном районе: вода подошла к складской зоне']);
    });
  });

  it('«Очистить поиск» доступна с клавиатуры и убирает запрос из адреса', async () => {
    const { user, router } = await openFeed('/?q=Южный');
    const clear = screen.getByRole('button', { name: 'Очистить поиск' });

    clear.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(search(router).get('q')).toBeNull();
    });
    expect(screen.getByRole('textbox', { name: 'Поиск по ленте' })).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Очистить поиск' })).toBeNull();
  });

  it('пустой результат предлагает сбросить фильтры', async () => {
    const { user } = renderApp('/?q=несуществующее');

    expect(await screen.findByText('Ничего не нашлось')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Сбросить фильтры' }));

    expect(await screen.findAllByRole('article')).not.toHaveLength(0);
  });
});

describe('лента: порядок, вкладки, сводка', () => {
  it('сначала срочные, затем по дате обновления', async () => {
    await openFeed();

    const times = screen.getAllByRole('article').map((card) => ({
      urgent: within(card).queryByText('Срочно') !== null,
      updatedAt: Date.parse(card.querySelector('time')?.dateTime ?? ''),
    }));
    const firstRegular = times.findIndex((item) => !item.urgent);
    expect(firstRegular).toBeGreaterThan(0);
    expect(times.slice(firstRegular).some((item) => item.urgent)).toBe(false);
    const regularDates = times.slice(firstRegular).map((item) => item.updatedAt);
    expect(regularDates).toEqual([...regularDates].sort((a, b) => b - a));
  });

  it('вкладка «Под наблюдением» показывает возможную связь и попадает в адрес', async () => {
    const { user, router } = await openFeed();

    await user.click(screen.getByRole('tab', { name: 'Под наблюдением' }));

    await waitFor(() => {
      expect(search(router).get('tab')).toBe('watch');
    });
    await waitFor(() => {
      expect(cardTitles()).toContain('Заморозки в Озёрной области повредили часть озимых');
    });
    expect(cardTitles()).not.toContain('Паводок в Заречном районе: вода подошла к складской зоне');
  });

  it('сводка склоняет слова и включает фильтр по клику', async () => {
    const { user, router } = renderApp('/?tab=watch&stage=resolved');
    const digest = await screen.findByText(/^С \d+ \S+:$/);
    const bar = digest.parentElement ?? document.body;

    expect(within(bar).getByRole('button', { name: /^1\s+срочный риск$/ })).toBeInTheDocument();
    await user.click(within(bar).getByRole('button', { name: /возможност/ }));

    await waitFor(() => {
      expect(router.state.location.search).toBe('?kind=opportunity');
    });
  });
});

describe('лента: «Показать ещё» и «Скрыть»', () => {
  it('подгружает следующую страницу по курсору', async () => {
    const { user } = await openFeed();
    const before = screen.getAllByRole('article').length;

    await user.click(screen.getByRole('button', { name: 'Показать ещё' }));

    await waitFor(() => {
      expect(screen.getAllByRole('article').length).toBeGreaterThan(before);
    });
    expect(screen.queryByRole('button', { name: 'Показать ещё' })).not.toBeInTheDocument();
  });

  it('скрывает карточку сразу и возвращает по «Отменить»', async () => {
    const { user } = await openFeed();
    const title = 'Паводок в Заречном районе: вода подошла к складской зоне';

    await user.click(screen.getByRole('button', { name: `Скрыть: ${title}` }));

    expect(cardTitles()).not.toContain(title);
    const toast = await screen.findByText('Скрыто');
    expect(toast).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отменить' }));

    await waitFor(() => {
      expect(cardTitles()[0]).toBe(title);
    });
  });

  it('карточка — одна ссылка на инсайт с названием события', async () => {
    await openFeed();

    const link = screen.getByRole('link', {
      name: 'Паводок в Заречном районе: вода подошла к складской зоне',
    });
    expect(link).toHaveAttribute('href', '/insights/agro-flood');
  });

  it.each([
    ['время', (card: HTMLElement) => card.querySelector('time') ?? card],
    ['цепочку', (card: HTMLElement) => within(card).getByText(/→/)],
  ])('клик по тексту с подсказкой (%s) тоже открывает инсайт', async (_, pick) => {
    const { user, router } = await openFeed();

    await user.click(pick(screen.getAllByRole('article')[0] ?? document.body));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/insights/agro-flood');
    });
  });

  it('у обрезанного времени и строк есть подсказки с полным текстом', async () => {
    await openFeed();
    const card = screen.getAllByRole('article')[0] ?? document.body;

    expect(within(card).getByText(/→/)).toHaveAttribute(
      'title',
      'Паводок в Заречном районе → Склад «Южный-2» → Поставка упаковки',
    );
    expect(card.querySelector('time')).toHaveAttribute('title', expect.stringMatching(/\d{4} г\./));
  });
});
