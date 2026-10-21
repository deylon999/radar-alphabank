import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/ApiError';
import { QueryView } from './QueryView';

const base = { error: null, isError: false, isFetching: false, refetch: vi.fn() };

function renderView(query: Parameters<typeof QueryView<string[]>>[0]['query']) {
  return render(
    <QueryView
      query={query}
      skeleton={<p>Скелетон</p>}
      errorTitle="Не удалось загрузить ленту"
      isEmpty={(items) => items.length === 0}
      empty={<p>Пусто</p>}
    >
      {(items) => <p>{items.join(', ')}</p>}
    </QueryView>,
  );
}

describe('QueryView', () => {
  it('показывает скелетон, пока данных нет', () => {
    renderView({ ...base, data: undefined });

    expect(screen.getByText('Скелетон')).toBeInTheDocument();
  });

  it('показывает ошибку человеческим языком и повторяет запрос', async () => {
    const refetch = vi.fn();
    renderView({
      ...base,
      data: undefined,
      isError: true,
      error: new ApiError({ kind: 'network', message: 'fetch failed' }),
      refetch,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Не удалось загрузить ленту');
    expect(screen.getByRole('alert')).toHaveTextContent('Проверьте соединение');
    expect(screen.getByRole('alert')).not.toHaveTextContent('fetch failed');
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('показывает пустое состояние', () => {
    renderView({ ...base, data: [] });

    expect(screen.getByText('Пусто')).toBeInTheDocument();
  });

  it('показывает данные, даже если повторная загрузка упала', () => {
    renderView({ ...base, data: ['Риск', 'Возможность'], isError: true, error: new Error('x') });

    expect(screen.getByText('Риск, Возможность')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
