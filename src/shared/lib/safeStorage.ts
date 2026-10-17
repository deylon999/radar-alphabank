/**
 * localStorage, который не ломает приложение: в приватном режиме, при запрете cookies
 * или переполнении квоты чтение возвращает null, а запись молча пропускается.
 */
export const safeStorage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Хранилище недоступно — значение просто не переживёт перезагрузку.
    }
  },
};
