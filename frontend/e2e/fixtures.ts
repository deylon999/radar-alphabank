import { test as base } from '@playwright/test';

export { expect, type Page } from '@playwright/test';

const SESSION_KEY = 'radar-mock-session-v1';

interface Options {
  /** Вошедший пользователь моков; `null` — без входа. По умолчанию — владелец U_9250. */
  signedInAs: string | null;
}

/**
 * Сессия моков живёт в sessionStorage вкладки: кладём её до запуска приложения, чтобы тесты
 * разделов не проходили вход каждый раз. Вход проверяется отдельно, в auth.spec.ts.
 */
export const test = base.extend<Options>({
  signedInAs: ['user-u9250', { option: true }],
  page: async ({ page, signedInAs }, use) => {
    if (signedInAs) {
      await page.addInitScript(
        ([key, userId]) => {
          if (!window.sessionStorage.getItem(key)) {
            window.sessionStorage.setItem(key, JSON.stringify({ userId }));
          }
        },
        [SESSION_KEY, signedInAs] as const,
      );
    }
    await use(page);
  },
});
