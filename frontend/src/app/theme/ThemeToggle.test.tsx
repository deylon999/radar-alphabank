import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeToggle } from './ThemeToggle';
import { THEME_STORAGE_KEY } from './useTheme';

function mockSystemTheme(dark: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query): MediaQueryList => ({
    matches: dark && query === '(prefers-color-scheme: dark)',
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

const toggle = () => screen.getByRole('button', { name: 'Тёмная тема' });

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('переключатель темы', () => {
  it('без выбора следует за системой', () => {
    mockSystemTheme(true);
    render(<ThemeToggle />);

    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('запоминает выбор, отличный от системы', async () => {
    mockSystemTheme(false);
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(toggle());

    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('возврат к системной теме забывает выбор', async () => {
    mockSystemTheme(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const user = userEvent.setup();
    render(<ThemeToggle />);
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');

    await user.click(toggle());

    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
