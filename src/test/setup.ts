import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom не реализует matchMedia, а адаптивные компоненты core-components его вызывают.
// Тесты api и моков идут в окружении node — там window нет.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => {
      const listeners = new EventTarget();
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: listeners.addEventListener.bind(listeners),
        removeEventListener: listeners.removeEventListener.bind(listeners),
        dispatchEvent: listeners.dispatchEvent.bind(listeners),
      };
    },
  });
}

// jsdom не реализует ResizeObserver, а Tabs из core-components следят за размерами вкладок.
if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'function') {
  class ResizeObserverStub implements ResizeObserver {
    observe(): void {
      // Размеры в jsdom не меняются — наблюдать нечего.
    }
    unobserve(): void {
      // См. observe.
    }
    disconnect(): void {
      // См. observe.
    }
  }
  window.ResizeObserver = ResizeObserverStub;
}
