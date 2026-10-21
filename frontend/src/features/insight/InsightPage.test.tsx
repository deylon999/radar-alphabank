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

const FLOOD = 'ЦБ сохранил ставку 14% и ужесточил риторику: кредиты не подешевеют до конца года';

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
    await openInsight('u9250-key-rate');

    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual([
      'Что случилось',
      'Почему это касается вас',
      'Как оценивает Альфа-Банк',
      'Возможное последствие',
      'Основания',
      'Что неизвестно',
      'Задать вопрос',
      'Источники',
      'Как получен вывод',
      'История изменений',
      'Что проверить',
      'Предложение Альфа-Банка',
      'Обратная связь',
    ]);
  });

  it('позиция банка отделена от выводов AI и показывает пересмотр оценки', async () => {
    await openInsight('u9250-key-rate');
    const bank = screen.getByRole('region', { name: 'Как оценивает Альфа-Банк' });

    expect(within(bank).getByText('Позиция банка')).toBeInTheDocument();
    expect(within(bank).queryByText('Вывод AI')).toBeNull();
    expect(bank).toHaveTextContent('Ждём сохранения ставки 14,0%');
    expect(bank).toHaveTextContent('11 сентября 2026, с. 1');
    expect(bank).toHaveTextContent('Банк пересмотрел оценку');
    expect(bank).toHaveTextContent('Было: Ждём ставку 13,5% на конец 2026 года');
    for (const name of ['Почему это касается вас', 'Возможное последствие', 'Задать вопрос']) {
      expect(
        within(screen.getByRole('region', { name })).getByText('Вывод AI'),
      ).toBeInTheDocument();
    }
  });

  it('устаревший материал банка — с предупреждением, без материала — так и сказано', async () => {
    const { unmount } = await openInsight('u9250-steel');
    expect(screen.getByRole('note')).toHaveTextContent(
      'Материал устарел. Обзор от 15 апреля 2021 не отражает текущую ситуацию',
    );
    unmount();

    await openInsight('u34911-port');
    expect(screen.getByRole('region', { name: 'Как оценивает Альфа-Банк' })).toHaveTextContent(
      'Альфа-Банк не публиковал оценку по этой теме',
    );
  });

  it('признаки компании и шаги агента объясняют вывод', async () => {
    const { user } = await openInsight('u9250-key-rate');
    const why = screen.getByRole('region', { name: 'Почему это касается вас' });
    expect(
      within(why).getByRole('heading', { name: 'Признаки вашей компании в выводе' }),
    ).toBeVisible();
    expect(why).toHaveTextContent('Продукты банкакредит, лизинг, банковские гарантии');

    const trace = screen.getByRole('region', { name: 'Как получен вывод' });
    await user.click(within(trace).getByText('Показать 5 шагов'));
    const steps = within(trace).getAllByRole('listitem');
    expect(steps).toHaveLength(5);
    expect(steps[3]).toHaveTextContent(/^Проверка.*Материалы расходятся/);
  });

  it('вопрос по подсказке и свой вопрос получают ответ со ссылками на источники', async () => {
    const { user } = await openInsight('u9250-key-rate');
    const ask = screen.getByRole('region', { name: 'Задать вопрос' });

    await user.click(within(ask).getByRole('button', { name: 'Что будет при ставке 12%?' }));
    const answers = await within(ask).findByRole('list', { name: 'Ответы' });
    expect(answers).toHaveTextContent('Позиция Альфа-Банка: ждём сохранения ставки 14,0%');
    expect(answers).toHaveTextContent('Аналитика Альфа-Банка: Ключевая ставка ЦБ РФ');
    expect(within(ask).queryByRole('button', { name: 'Что будет при ставке 12%?' })).toBeNull();

    await user.type(within(ask).getByRole('textbox'), 'А что с лизингом?');
    await user.click(within(ask).getByRole('button', { name: 'Спросить' }));
    await waitFor(() => {
      expect(
        within(answers).getAllByText(/^(Что будет при ставке 12%\?|А что с лизингом\?)$/),
      ).toHaveLength(2);
    });
    expect(within(ask).getByRole('textbox')).toHaveValue('');
  });

  it('предложение банка подписано и ведёт на продукт в новой вкладке', async () => {
    await openInsight('u9250-key-rate');
    const offer = screen.getByRole('region', { name: 'Предложение Альфа-Банка' });

    expect(offer).toHaveTextContent('Процентный своп');
    expect(within(offer).getByRole('link', { name: /Подробнее/ })).toHaveAttribute(
      'target',
      '_blank',
    );
  });

  it('при открытии помечает инсайт прочитанным', async () => {
    await openInsight('u9250-key-rate');

    await waitFor(() => {
      expect(store.read().insights.find((item) => item.id === 'u9250-key-rate')?.status).toBe(
        'read',
      );
    });
  });

  it('цепочка подписывает роль каждого шага и заканчивается компанией', async () => {
    await openInsight('u9250-key-rate');
    const section = screen.getByRole('region', { name: 'Почему это касается вас' });
    const steps = within(section).getAllByRole('listitem');

    expect(steps.map((step) => step.textContent)).toEqual([
      'СобытиеКлючевая ставка 14%',
      'РынокПлавающая ставка по кредиту',
      'ПоставкаПроцентные расходы',
      'Ваша компанияU_9250',
    ]);
  });

  it('источники открываются в новой вкладке безопасно', async () => {
    await openInsight('u9250-key-rate');
    const links = within(screen.getByRole('region', { name: 'Источники' })).getAllByRole('link');

    expect(links).toHaveLength(3);
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAccessibleName(/откроется в новой вкладке/);
    }
  });

  it('чек-лист считает отмеченное и помнит его после повторного открытия', async () => {
    const { user, unmount } = await openInsight('u9250-key-rate');
    const section = screen.getByRole('region', { name: 'Что проверить' });
    expect(section).toHaveTextContent('0 из 3');

    await user.click(within(section).getAllByRole('checkbox')[0] ?? section);

    expect(section).toHaveTextContent('1 из 3');
    unmount();
    await openInsight('u9250-key-rate');
    expect(screen.getByRole('region', { name: 'Что проверить' })).toHaveTextContent('1 из 3');
  });

  it('отзыв уходит одним нажатием, комментарий — по желанию', async () => {
    const { user } = await openInsight('u9250-key-rate');
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
    expect(store.read().feedback.slice(-2)).toMatchObject([
      { insightId: 'u9250-key-rate', useful: true },
      { insightId: 'u9250-key-rate', useful: true, comment: 'Нужна карта затопления' },
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
