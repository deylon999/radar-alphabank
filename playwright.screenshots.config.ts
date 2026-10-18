import { defineConfig } from '@playwright/test';

import base from './playwright.config';

/**
 * Скриншоты всех страниц на 360, 768 и 1280 px в docs/screenshots: `npm run screenshots`.
 * Отдельный конфиг, чтобы съёмка не входила в обычный `npm run e2e`.
 */
export default defineConfig({
  ...base,
  testMatch: '**/*.shot.ts',
  reporter: 'list',
});
