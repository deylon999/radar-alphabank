import { setupWorker } from 'msw/browser';

import { createMockStore, type MockStorage } from './db';
import { createHandlers } from './handlers';

const MIN_LATENCY_MS = 300;
const LATENCY_SPREAD_MS = 500;

/** Задержка 300–800 мс: псевдослучайная, но одинаковая от запуска к запуску. */
function createLatency(): () => number {
  let step = 0;
  return () => MIN_LATENCY_MS + ((step++ * 137) % (LATENCY_SPREAD_MS + 1));
}

function getSessionStorage(): MockStorage | undefined {
  try {
    return window.sessionStorage;
  } catch {
    return undefined;
  }
}

const worker = setupWorker(
  ...createHandlers({
    store: createMockStore(getSessionStorage()),
    latency: createLatency(),
    isErrorMode: () => new URLSearchParams(window.location.search).get('mock') === 'errors',
  }),
);

const START_OPTIONS = { onUnhandledFrame: 'bypass', quiet: true } as const;

export async function startMocks(): Promise<void> {
  await worker.start(START_OPTIONS);
}

let restarting: Promise<void> | undefined;

/**
 * Браузер усыпляет Service Worker, когда вкладка долго в фоне. Проснувшись, он не помнит
 * страницу и пропускает её запросы в сеть — сайт получает HTML вместо JSON. Повторный старт
 * снова подключает страницу. Одновременные вызовы ждут один и тот же перезапуск.
 */
export function restartMocks(): Promise<void> {
  restarting ??= (async () => {
    await worker.stop();
    await worker.start(START_OPTIONS);
  })().finally(() => {
    restarting = undefined;
  });
  return restarting;
}
