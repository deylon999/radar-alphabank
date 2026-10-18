import './app/styles/tokens.css';
import './app/styles/fonts.css';
import './app/styles/global.css';
import './app/styles/promo.css';
import './app/styles/overrides.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { apiConfig } from './api/config';
import { App } from './app/App';
import { preloadPage } from './app/router/routes';

/**
 * Моки грузятся отдельным чанком и только при VITE_USE_MOCKS=true. Первое условие Vite
 * подставляет при сборке: с VITE_USE_MOCKS=false MSW и фикстуры не попадают в dist.
 */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS === 'false' || !apiConfig.useMocks) {
    return;
  }
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Не найден корневой элемент #root');
}

// Код страницы качается параллельно с моками, а не после них.
preloadPage(window.location.pathname);
void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
