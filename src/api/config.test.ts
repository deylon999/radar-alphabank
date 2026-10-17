import { describe, expect, it } from 'vitest';

import { parseApiConfig } from './config';

describe('parseApiConfig', () => {
  it('читает адрес бэкенда и флаг моков из env', () => {
    expect(
      parseApiConfig({ VITE_API_URL: 'https://api.radar.test/', VITE_USE_MOCKS: 'false' }),
    ).toEqual({ apiUrl: 'https://api.radar.test', useMocks: false });
  });

  it('без env берёт значения из .env.example', () => {
    expect(parseApiConfig({})).toEqual({ apiUrl: 'http://localhost:8000', useMocks: true });
  });

  it('отклоняет неверный адрес и неверный флаг', () => {
    expect(() => parseApiConfig({ VITE_API_URL: 'не адрес' })).toThrow();
    expect(() => parseApiConfig({ VITE_USE_MOCKS: 'yes' })).toThrow();
  });
});
