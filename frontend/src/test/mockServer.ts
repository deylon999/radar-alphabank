import { setupServer } from 'msw/node';

import { createMockStore, type MockSession } from '../mocks/db';
import { DEFAULT_USER_ID } from '../mocks/fixtures';
import { createHandlers } from '../mocks/handlers';

/**
 * MSW для тестов в Node: те же обработчики, что в браузере, без задержки и без хранилища.
 * По умолчанию пользователь уже вошёл — владелец U_9250; `{ session: {} }` — не вошёл.
 */
export function createMockServer({
  session = { userId: DEFAULT_USER_ID },
}: { session?: MockSession } = {}) {
  const store = createMockStore(undefined, { initialSession: session });
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
