import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Тёмная тема Альфы подменяет --color-light-* в :root, но стили компонентов объявляют те же
 * переменные в своём :root и грузятся позже — тема проигрывала. html:root сильнее :root.
 */
const darkThemeWins = {
  postcssPlugin: 'alfa-dark-theme-wins',
  Rule(rule: { selector: string; source?: { input: { file?: string } } }) {
    const file = rule.source?.input.file ?? '';
    if (rule.selector === ':root' && /(themes\/dark|-dark)\.css$/.test(file)) {
      rule.selector = 'html:root';
    }
  },
};

export default defineConfig({
  plugins: [react()],
  css: { postcss: { plugins: [darkThemeWins] } },
  resolve: {
    // Справочник доменных зон из tldts не нужен мокам — см. src/mocks/tldtsLite.ts.
    alias: { tldts: fileURLToPath(new URL('./src/mocks/tldtsLite.ts', import.meta.url)) },
  },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
});
