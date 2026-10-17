import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { StylePreviewPage } from './StylePreviewPage';

describe('StylePreviewPage', () => {
  it('показывает название продукта и задаёт заголовок вкладки', () => {
    render(<StylePreviewPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Радар' })).toBeInTheDocument();
    expect(document.title).toBe('Проверка стилей — Радар');
  });

  it('выводит тестовую строку кириллицы в каждом начертании', () => {
    render(<StylePreviewPage />);

    expect(screen.getAllByText(/Съешь же ещё этих мягких французских булок/)).toHaveLength(4);
  });

  it('чекбокс из core-components переключается с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<StylePreviewPage />);
    const checkbox = screen.getByRole('checkbox', { name: 'Проверить статус отгрузки' });

    checkbox.focus();
    await user.keyboard(' ');

    expect(checkbox).toBeChecked();
  });
});
