import { screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';
import { NBSP } from '../../shared/lib/typography';
import { topicSummary } from './TopicGroups';

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

const KEY_RATE = 'ЦБ сохранил ставку 14% и ужесточил риторику: кредиты не подешевеют до конца года';

describe('обзор', () => {
  it('по темам: сначала тема со срочным риском, у темы — счёт рисков и возможностей', async () => {
    renderApp('/overview');
    const [first] = await screen.findAllByRole('region');
    if (!first) throw new Error('Нет ни одной темы');

    expect(within(first).getByRole('heading', { level: 2 })).toHaveTextContent('Ставка и кредиты');
    expect(first).toHaveTextContent('1 риск, из них 1 срочный · 1 возможность');
    expect(within(first).getAllByRole('link')[0]).toHaveTextContent(KEY_RATE);
  });

  it('по материалам банка: дата, число выводов, устаревший обзор помечен', async () => {
    const { user, router } = renderApp('/overview');
    await screen.findAllByRole('region');

    await user.click(screen.getByRole('tab', { name: 'По материалам банка' }));

    expect(router.state.location.search).toBe('?view=bank');
    const steel = await screen.findByRole('region', { name: /Российская сталь/ });
    expect(steel).toHaveTextContent('15 апреля 2021 · учтён в 1 выводе');
    expect(within(steel).getByText('Материал устарел')).toBeInTheDocument();
    expect(screen.getAllByRole('region').at(-1)).toBe(steel);
  });

  it('из обзора в инсайт и обратно: крошки ведут в обзор с тем же разрезом', async () => {
    const { user, router } = renderApp('/overview?view=bank');
    await screen.findAllByRole('region');

    const [link] = screen.getAllByRole('link', { name: KEY_RATE });
    if (!link) throw new Error('Нет ссылки на инсайт');
    await user.click(link);
    await screen.findByRole('heading', { level: 1, name: KEY_RATE });
    const crumbs = screen.getByRole('navigation', { name: 'Хлебные крошки' });
    const back = within(crumbs).getByRole('link', { name: 'Обзор' });
    expect(back).toHaveAttribute('href', '/overview?view=bank');

    await user.click(back);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/overview');
    });
    expect(router.state.location.search).toBe('?view=bank');
  });

  it('скрытый вывод не попадает в обзор', async () => {
    store.write((db) => {
      const insight = db.insights.find((item) => item.id === 'u9250-key-rate');
      if (insight) insight.status = 'dismissed';
    });
    renderApp('/overview');
    await screen.findAllByRole('region');

    expect(screen.queryByRole('link', { name: KEY_RATE })).not.toBeInTheDocument();
  });
});

describe('подпись темы', () => {
  it.each([
    [{ urgent: 0, risks: 2, opportunities: 0 }, '2 риска'],
    [{ urgent: 2, risks: 5, opportunities: 1 }, '5 рисков, из них 2 срочных · 1 возможность'],
    [{ urgent: 0, risks: 0, opportunities: 3 }, '3 возможности'],
  ])('%o → %s', (counts, text) => {
    expect(topicSummary(counts).replaceAll(NBSP, ' ')).toBe(text);
  });
});
