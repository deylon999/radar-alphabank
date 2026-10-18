import { screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockServer } from '../../test/mockServer';
import { renderApp } from '../../test/renderApp';
import { SELECTED_COMPANY_STORAGE_KEY } from './SelectedCompanyProvider';

const { server, store } = createMockServer();

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
beforeEach(() => {
  window.localStorage.clear();
  // Мышь или тачпад: вместо системного списка показывается своё меню.
  vi.spyOn(window, 'matchMedia').mockImplementation((query): MediaQueryList => ({
    matches: query.includes('pointer: fine'),
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
});
afterEach(() => {
  store.reset();
});
afterAll(() => {
  server.close();
});

const trigger = () => screen.findByRole('button', { name: /^Компания: / });

describe('меню компаний (мышь)', () => {
  it('показывает компании и отмечает выбранную', async () => {
    const { user } = renderApp('/');
    const button = await trigger();
    expect(button).toHaveAccessibleName('Компания: АО «Полевея Агро»');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);

    const menu = screen.getByRole('menu', { name: 'Компания' });
    const items = within(menu).getAllByRole('menuitemradio');
    expect(items.map((item) => item.textContent)).toEqual([
      'АО «Полевея Агро»',
      'ООО «Кальвета»',
      'ООО «Кварталика»',
    ]);
    expect(items[0]).toHaveAttribute('aria-checked', 'true');
    expect(items[0]).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('выбор мышью меняет компанию и ленту', async () => {
    const { user } = renderApp('/');
    await user.click(await trigger());

    await user.click(screen.getByRole('menuitemradio', { name: /Кварталика/ }));

    expect(screen.queryByRole('menu')).toBeNull();
    expect(await trigger()).toHaveAccessibleName('Компания: ООО «Кварталика»');
    expect(await screen.findByRole('link', { name: /Авария на подстанции/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY)).toBe('kvartalika');
  });

  it('работает с клавиатуры: стрелки, Enter, Esc', async () => {
    const { user } = renderApp('/');
    const button = await trigger();
    button.focus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /Полевея/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /Кальвета/ })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitemradio', { name: /Кварталика/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: /Полевея/ })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(button).toHaveFocus();

    await user.keyboard('{Enter}{ArrowDown}{Enter}');
    await waitFor(() => {
      expect(window.localStorage.getItem(SELECTED_COMPANY_STORAGE_KEY)).toBe('kalveta');
    });
    expect(await trigger()).toHaveFocus();
  });

  it('закрывается кликом снаружи', async () => {
    const { user } = renderApp('/');
    await user.click(await trigger());
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await user.click(screen.getByRole('heading', { level: 1 }));

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
