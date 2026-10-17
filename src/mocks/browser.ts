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

export const worker = setupWorker(
  ...createHandlers({
    store: createMockStore(getSessionStorage()),
    latency: createLatency(),
    isErrorMode: () => new URLSearchParams(window.location.search).get('mock') === 'errors',
  }),
);
