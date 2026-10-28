import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { login, makeOrderPayload, setup } from './helpers';
import { expectSchema } from './schema';
import { orderSchema } from './schemas/order.schema';
import { server } from './msw/server';

// These tests exercise Express directly; Lab 4 keeps its strict MSW setup.
beforeAll(() => server.close());

describe('POST /orders — п’ять рівнів перевірки', () => {
  let context: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    context = await setup();
  });

  it('створює замовлення: 201, значення, Location і Content-Type', async () => {
    const { app, auth } = context;
    const response = await request(app)
      .post('/orders')
      .set(auth)
      .send(makeOrderPayload());
    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.headers.location).toBe(`/orders/${response.body.id}`);
    expect(response.body).toMatchObject({
      tier: 'basic',
      subtotal: 500,
      total: 560,
      items: makeOrderPayload().items,
    });
    expect(response.body.id).toEqual(expect.any(String));
  });

  it('створене замовлення доступне за GET і збігається повністю', async () => {
    const { app, auth } = context;
    const created = await request(app)
      .post('/orders')
      .set(auth)
      .send(makeOrderPayload())
      .expect(201);
    const fetched = await request(app)
      .get(created.headers.location)
      .set(auth)
      .expect(200);
    expect(fetched.headers['content-type']).toMatch(/^application\/json/);
    expect(fetched.body).toEqual(created.body);
  });

  it('JSON Schema: відповідь POST /orders відповідає контракту', async () => {
    const { app, auth } = context;
    const response = await request(app)
      .post('/orders')
      .set(auth)
      .send(makeOrderPayload())
      .expect(201);
    expectSchema(response.body, orderSchema);
  });

  it.each([
    { name: 'порожній список', items: [], code: 'EMPTY_ORDER' },
    { name: 'відсутні позиції', items: undefined, code: 'EMPTY_ORDER' },
    { name: 'null замість списку', items: null, code: 'EMPTY_ORDER' },
    { name: 'об’єкт замість списку', items: {}, code: 'EMPTY_ORDER' },
    { name: 'рядок замість списку', items: 'items', code: 'EMPTY_ORDER' },
    {
      name: 'від’ємна ціна',
      items: [{ sku: 'SKU-0001', price: -1, qty: 1 }],
      code: 'INVALID_PRICE',
    },
    {
      name: 'ціна як рядок',
      items: [{ sku: 'SKU-0001', price: '10', qty: 1 }],
      code: 'INVALID_PRICE',
    },
    {
      name: 'ціна null',
      items: [{ sku: 'SKU-0001', price: null, qty: 1 }],
      code: 'INVALID_PRICE',
    },
    {
      name: 'відсутня ціна',
      items: [{ sku: 'SKU-0001', qty: 1 }],
      code: 'INVALID_PRICE',
    },
    { name: 'null замість позиції', items: [null], code: 'INVALID_PRICE' },
    {
      name: 'нульова кількість',
      items: [{ sku: 'SKU-0001', price: 10, qty: 0 }],
      code: 'INVALID_QTY',
    },
    {
      name: 'від’ємна кількість',
      items: [{ sku: 'SKU-0001', price: 10, qty: -1 }],
      code: 'INVALID_QTY',
    },
    {
      name: 'дробова кількість',
      items: [{ sku: 'SKU-0001', price: 10, qty: 1.5 }],
      code: 'INVALID_QTY',
    },
    {
      name: 'кількість як рядок',
      items: [{ sku: 'SKU-0001', price: 10, qty: '1' }],
      code: 'INVALID_QTY',
    },
    {
      name: 'відсутня кількість',
      items: [{ sku: 'SKU-0001', price: 10 }],
      code: 'INVALID_QTY',
    },
  ])('відхиляє $name → $code без збереження', async ({ items, code }) => {
    const { app, auth } = context;
    const response = await request(app)
      .post('/orders')
      .set(auth)
      .send({ items })
      .expect(400);
    expect(response.body).toEqual({ code });
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(
      (await request(app).get('/orders').set(auth).expect(200)).body,
    ).toEqual([]);
  });

  it.each([
    ['bob@example.com', 0, 1, 0, 60],
    ['bob@example.com', 500, 1, 500, 560],
    ['bob@example.com', 999.99, 1, 999.99, 1059.99],
    ['bob@example.com', 1000, 1, 1000, 1000],
    ['bob@example.com', 1999.99, 1, 1999.99, 1999.99],
    ['bob@example.com', 1000, 2, 2000, 1900],
    ['alice@example.com', 500, 1, 500, 510],
    ['alice@example.com', 1100, 1, 1100, 1050],
    ['alice@example.com', 1111.11, 1, 1111.11, 1000],
    ['alice@example.com', 1000, 2, 2000, 1700],
    ['bob@example.com', 0.335, 3, 1.01, 61.01],
  ] as const)(
    'ціни для %s: %s × %s → subtotal %s, total %s',
    async (email, price, qty, subtotal, total) => {
      const { app } = context;
      const token = await login(app, email);
      const response = await request(app)
        .post('/orders')
        .auth(token, { type: 'bearer' })
        .send({ items: [{ sku: 'SKU-0001', price, qty }] })
        .expect(201);
      expect(response.body.subtotal).toBe(subtotal);
      expect(response.body.total).toBe(total);
      expect(response.body.tier).toBe(
        email === 'alice@example.com' ? 'gold' : 'basic',
      );
    },
  );

  it('підсумовує кілька позицій і відкидає непублічні вхідні поля', async () => {
    const { app, auth } = context;
    const response = await request(app)
      .post('/orders')
      .set(auth)
      .send({
        ownerId: 'u1',
        tier: 'gold',
        items: [
          { sku: 'SKU-0001', price: 200, qty: 2, ownerId: 'secret' },
          { sku: 'SKU-0001', price: 100, qty: 1 },
        ],
      })
      .expect(201);
    expect(response.body).toMatchObject({
      tier: 'basic',
      subtotal: 500,
      total: 560,
    });
    expectSchema(response.body, orderSchema);
  });

  it.each(['1e309', '1e308'])(
    'відхиляє нескінченну ціну або переповнення суми %s без збереження',
    async (price) => {
      const { app, auth } = context;
      const response = await request(app)
        .post('/orders')
        .set(auth)
        .set('Content-Type', 'application/json')
        .send(`{"items":[{"sku":"SKU-0001","price":${price},"qty":2}]}`)
        .expect(400);
      expect(response.body).toEqual({ code: 'INVALID_PRICE' });
      expect(
        (await request(app).get('/orders').set(auth).expect(200)).body,
      ).toEqual([]);
    },
  );

  it('відсутнє тіло замовлення → EMPTY_ORDER', async () => {
    const { app, auth } = context;
    expect(
      (await request(app).post('/orders').set(auth).expect(400)).body,
    ).toEqual({ code: 'EMPTY_ORDER' });
  });
});

describe('Автентифікація та авторизація', () => {
  let app: ReturnType<typeof createApp>;
  beforeEach(() => {
    app = createApp();
  });

  it.each(['alice@example.com', 'bob@example.com'])(
    'вхід %s повертає новий токен',
    async (email) => {
      const first = await login(app, email);
      const second = await login(app, email);
      expect(first).toEqual(expect.any(String));
      expect(first).not.toBe(second);
    },
  );

  it.each([
    { email: 'bob@example.com', password: 'wrong' },
    { email: 'unknown@example.com', password: 'Secret123' },
    { email: 'alice@example.com' },
    {},
  ])('неправильні облікові дані %j → 401', async (body) => {
    const response = await request(app)
      .post('/auth/login')
      .send(body)
      .expect(401);
    expect(response.body).toEqual({ code: 'INVALID_CREDENTIALS' });
  });

  it('відсутнє тіло входу → INVALID_CREDENTIALS', async () => {
    expect((await request(app).post('/auth/login').expect(401)).body).toEqual({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it.each([
    ['get', '/orders'],
    ['post', '/orders'],
    ['get', '/orders/missing'],
    ['delete', '/orders/missing'],
  ] as const)('%s %s вимагає токен', async (method, path) => {
    const client = request(app);
    const response = await client[method](path)
      .send(makeOrderPayload())
      .expect(401);
    expect(response.body).toEqual({ code: 'UNAUTHORIZED' });
  });

  it.each(['Bearer fake', 'Basic fake', 'some-token', 'Bearer'])(
    'підроблений заголовок %s → 401',
    async (header) => {
      const response = await request(app)
        .get('/orders')
        .set('Authorization', header)
        .expect(401);
      expect(response.body).toEqual({ code: 'UNAUTHORIZED' });
    },
  );

  it.each(['raw', 'Basic', 'duplicate'])(
    'відхиляє неправильний Bearer із дійсним токеном: %s',
    async (kind) => {
      const token = await login(app, 'bob@example.com');
      const header =
        kind === 'raw'
          ? token
          : kind === 'Basic'
            ? `Basic ${token}`
            : `Bearer Bearer ${token}`;
      expect(
        (
          await request(app)
            .get('/orders')
            .set('Authorization', header)
            .expect(401)
        ).body,
      ).toEqual({ code: 'UNAUTHORIZED' });
    },
  );

  it('чуже замовлення: GET і DELETE → 404; власник зберігає доступ', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');
    const created = await request(app)
      .post('/orders')
      .auth(alice, { type: 'bearer' })
      .send(makeOrderPayload())
      .expect(201);
    for (const method of ['get', 'delete'] as const) {
      const client = request(app);
      const response = await client[method](created.headers.location)
        .auth(bob, { type: 'bearer' })
        .expect(404);
      expect(response.body).toEqual({ code: 'NOT_FOUND' });
    }
    const owned = await request(app)
      .get(created.headers.location)
      .auth(alice, { type: 'bearer' })
      .expect(200);
    expectSchema(owned.body, orderSchema);
  });

  it('список містить лише власні замовлення зі схемою', async () => {
    const alice = await login(app, 'alice@example.com');
    const bob = await login(app, 'bob@example.com');
    await request(app)
      .post('/orders')
      .auth(alice, { type: 'bearer' })
      .send(makeOrderPayload())
      .expect(201);
    const own = await request(app)
      .post('/orders')
      .auth(bob, { type: 'bearer' })
      .send(makeOrderPayload())
      .expect(201);
    const list = await request(app)
      .get('/orders')
      .auth(bob, { type: 'bearer' })
      .expect(200);
    expect(list.body).toEqual([own.body]);
    expectSchema(list.body, { type: 'array', items: orderSchema });
    expect(list.headers['content-type']).toMatch(/^application\/json/);
  });

  it('ізолює токени й замовлення між застосунками', async () => {
    const token = await login(app, 'bob@example.com');
    const created = await request(app)
      .post('/orders')
      .auth(token, { type: 'bearer' })
      .send(makeOrderPayload())
      .expect(201);
    const other = createApp();
    await request(other)
      .get('/orders')
      .auth(token, { type: 'bearer' })
      .expect(401);
    const otherToken = await login(other, 'bob@example.com');
    expect(
      (
        await request(other)
          .get('/orders')
          .auth(otherToken, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toEqual([]);
    expect(
      (
        await request(other)
          .get(created.headers.location)
          .auth(otherToken, { type: 'bearer' })
          .expect(404)
      ).body,
    ).toEqual({ code: 'NOT_FOUND' });
  });

  it('неавторизоване видалення не змінює сховище', async () => {
    const token = await login(app, 'bob@example.com');
    const created = await request(app)
      .post('/orders')
      .auth(token, { type: 'bearer' })
      .send(makeOrderPayload())
      .expect(201);
    await request(app).delete(created.headers.location).expect(401);
    expect(
      (
        await request(app)
          .get(created.headers.location)
          .auth(token, { type: 'bearer' })
          .expect(200)
      ).body,
    ).toEqual(created.body);
  });
});

describe('DELETE /orders — ідемпотентність', () => {
  it('204 без тіла, повторний DELETE і наступний GET → 404', async () => {
    const { app, auth } = await setup();
    const created = await request(app)
      .post('/orders')
      .set(auth)
      .send(makeOrderPayload())
      .expect(201);
    const first = await request(app)
      .delete(created.headers.location)
      .set(auth)
      .expect(204);
    expect(first.text).toBe('');
    expect(first.headers['content-type']).toBeUndefined();
    for (const method of ['delete', 'get'] as const) {
      const client = request(app);
      const response = await client[method](created.headers.location)
        .set(auth)
        .expect(404);
      expect(response.body).toEqual({ code: 'NOT_FOUND' });
    }
    expect(
      (await request(app).get('/orders').set(auth).expect(200)).body,
    ).toEqual([]);
  });
});
