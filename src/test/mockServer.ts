import { setupServer } from 'msw/node';

import { createMockStore } from '../mocks/db';
import { createHandlers } from '../mocks/handlers';

/** MSW для тестов в Node: те же обработчики, что в браузере, без задержки и без хранилища. */
export function createMockServer() {
  const store = createMockStore();
  const state = { errorMode: false };
  const server = setupServer(
    ...createHandlers({ store, latency: () => 0, isErrorMode: () => state.errorMode }),
  );
  return {
    server,
    store,
    setErrorMode: (enabled: boolean) => {
      state.errorMode = enabled;
    },
  };
}
