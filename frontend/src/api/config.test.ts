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

  it('с моками ходит на адрес самого сайта, без моков — на VITE_API_URL', () => {
    const site = 'https://radar.vercel.app';
    expect(parseApiConfig({ VITE_USE_MOCKS: 'true' }, site).apiUrl).toBe(site);
    expect(
      parseApiConfig({ VITE_API_URL: 'https://api.radar.test', VITE_USE_MOCKS: 'false' }, site)
        .apiUrl,
    ).toBe('https://api.radar.test');
  });

  it('отклоняет неверный адрес и неверный флаг', () => {
    expect(() => parseApiConfig({ VITE_API_URL: 'не адрес' })).toThrow();
    expect(() => parseApiConfig({ VITE_USE_MOCKS: 'yes' })).toThrow();
  });
});
