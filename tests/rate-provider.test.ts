import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { HttpRateProvider } from '../src/rate-provider';
import { RATE_URL, server } from './msw/server';

const provider = new HttpRateProvider('https://api.example.com');

describe('HttpRateProvider — MSW', () => {
  it('повертає курс 41.25 з успішної відповіді', async () => {
    await expect(provider.getRate('USD', 'UAH')).resolves.toBe(41.25);
  });
  it('відхиляє HTTP 503', async () => {
    server.use(
      http.get(RATE_URL, () => new HttpResponse(null, { status: 503 })),
    );
    await expect(provider.getRate('USD', 'UAH')).rejects.toThrow(
      'RATE_UNAVAILABLE',
    );
  });
  it.each([
    { rate: '41.25' },
    {},
    null,
    [[]],
    { rate: 0 },
    { rate: -1 },
    { rate: null },
    41.25,
  ])('відхиляє некоректний формат %j', async (body) => {
    server.use(http.get(RATE_URL, () => HttpResponse.json(body)));
    await expect(provider.getRate('USD', 'UAH')).rejects.toThrow(
      'INVALID_RATE_FORMAT',
    );
  });
  it('відхиляє синтаксично неправильний JSON', async () => {
    server.use(http.get(RATE_URL, () => new HttpResponse('{broken')));
    await expect(provider.getRate('USD', 'UAH')).rejects.toThrow(
      'INVALID_RATE_FORMAT',
    );
  });
  it('надсилає точні query-параметри та кодує спеціальні символи', async () => {
    const captured: URL[] = [];
    server.use(
      http.get(RATE_URL, ({ request }) => {
        captured.push(new URL(request.url));
        return HttpResponse.json({ rate: 1 });
      }),
    );
    await provider.getRate('EUR', 'PLN');
    await provider.getRate('USD & test', 'UAH+test');
    expect(
      captured.map((url) => [
        url.searchParams.get('from'),
        url.searchParams.get('to'),
      ]),
    ).toEqual([
      ['EUR', 'PLN'],
      ['USD & test', 'UAH+test'],
    ]);
  });
  it('поширює мережеву помилку HttpResponse.error', async () => {
    server.use(http.get(RATE_URL, () => HttpResponse.error()));
    await expect(provider.getRate('USD', 'UAH')).rejects.toThrow();
  });
  it('після відмов знову використовує початковий обробник', async () => {
    await expect(provider.getRate('USD', 'UAH')).resolves.toBe(41.25);
  });
  it('блокує неописаний HTTP-запит без виходу в реальну мережу', async () => {
    await expect(
      fetch('https://unhandled.example.invalid/lab4'),
    ).rejects.toThrow('Cannot bypass a request');
  });
});
