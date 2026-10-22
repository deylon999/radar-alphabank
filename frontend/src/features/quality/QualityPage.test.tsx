import { screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { formatDuration } from '../../shared/lib/date';
import { NBSP } from '../../shared/lib/typography';
import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';
import { percent } from './format';

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

const plain = (text: string) => text.replaceAll(NBSP, ' ');

describe('экран качества', () => {
  it('плитки: доля полезных из последних оценок, открытия, вопросы, реакция', async () => {
    renderApp('/quality');
    const useful = await screen.findByText('Полезно', { selector: 'dt' });

    expect(useful.parentElement).toHaveTextContent('67 %6 из 9 оценок');
    expect(screen.getByText('Открыли').parentElement).toHaveTextContent('0 из 21 вывода');
    expect(screen.getByText('Вопросов агенту').parentElement).toHaveTextContent('4');
    expect(screen.getByText('Реакция').parentElement).toHaveTextContent('3 ч 30 мин');
    expect(screen.getByRole('note')).toHaveTextContent(/тестовых отзывов/);
  });

  it('полнота, темы, отзывы и вопросы со ссылками на выводы', async () => {
    renderApp('/quality');

    const completeness = await screen.findByRole('region', { name: 'Полнота выводов' });
    expect(completeness).toHaveTextContent(
      'С признаками компании, на которых построен вывод21 из 21 вывода',
    );
    expect(completeness).toHaveTextContent('На устаревшем материале банка — 1 вывод');

    const table = within(screen.getByRole('region', { name: 'По темам' })).getByRole('table');
    expect(within(table).getByRole('rowheader', { name: /^Ставка и кредиты/ })).toBeInTheDocument();

    const comments = screen.getByRole('region', { name: 'Что пишут в отзывах' });
    expect(within(comments).getAllByRole('listitem')[0]).toHaveTextContent(
      'у кого из поставщиков цены в евро',
    );
    expect(within(comments).getByRole('link', { name: /Металлопрокат дорожает/ })).toHaveAttribute(
      'href',
      '/insights/u9250-steel',
    );

    const questions = screen.getByRole('region', { name: 'О чём спрашивают агента' });
    expect(within(questions).getAllByRole('listitem')).toHaveLength(4);
  });

  it('скрытый вывод сразу виден в метриках', async () => {
    store.write((db) => {
      const insight = db.insights.find((item) => item.id === 'u9250-key-rate');
      if (insight) insight.status = 'dismissed';
    });
    renderApp('/quality');

    const tile = (await screen.findByText('Скрыли')).parentElement;
    expect(tile).toHaveTextContent('1 из 21 вывода');
  });
});

describe('доступ к метрикам', () => {
  it('без прав — понятное объяснение вместо данных', async () => {
    store.writeSession((session) => {
      session.userId = 'user-cfo';
    });
    renderApp('/quality');

    expect(await screen.findByText('Метрики доступны команде и экспертам')).toBeInTheDocument();
  });
});

describe('форматирование', () => {
  it.each([
    [50, '50 мин'],
    [60, '1 ч'],
    [210, '3 ч 30 мин'],
    [1440, '1 дн'],
    [3000, '2 дн 2 ч'],
  ])('%i минут → %s', (minutes, text) => {
    expect(plain(formatDuration(minutes))).toBe(text);
  });

  it('доля без знаменателя — прочерк', () => {
    expect(percent(0, 0)).toBe('—');
    expect(plain(percent(2, 3))).toBe('67 %');
  });
});
