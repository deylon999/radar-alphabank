import { describe, expect, it } from 'vitest';

import { getDomain } from './tldtsLite';

describe('getDomain (замена tldts для моков)', () => {
  it('возвращает два последних уровня имени', () => {
    expect(getDomain('api.radar.example.com')).toBe('example.com');
    expect(getDomain('Example.COM.')).toBe('example.com');
  });

  it('не считает доменом localhost и IP-адреса', () => {
    expect(getDomain('localhost')).toBeNull();
    expect(getDomain('127.0.0.1')).toBeNull();
    expect(getDomain('::1')).toBeNull();
  });
});
