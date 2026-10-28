import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { login, makeOrderPayload, setup } from './helpers';
import { expectSchema } from './schema';
import { orderSchema } from './schemas/order.schema';
import { server } from './msw/server';

beforeAll(() => server.close());

describe('SKU — варіант 12', () => {
  let context: Awaited<ReturnType<typeof setup>>;
  beforeEach(async () => {
    context = await setup();
  });

  it.each(['ABC-1234', 'XYZ-0001', 'AAA-0000', 'ZZZ-9999', 'QWE-4567'])(
    'приймає %s: статус, схема, значення, заголовки та збереження',
    async (sku) => {
      const { app, auth } = context;
      const response = await request(app)
        .post('/orders')
        .set(auth)
        .send({ items: [{ sku, price: 500, qty: 1 }] })
        .expect(201);
      expectSchema(response.body, orderSchema);
      expect(response.body.items).toEqual([{ sku, price: 500, qty: 1 }]);
      expect(response.body.total).toBe(560);
      expect(response.headers.location).toBe(`/orders/${response.body.id}`);
      expect(response.headers['content-type']).toMatch(/^application\/json/);
      const fetched = await request(app)
        .get(response.headers.location)
        .set(auth)
        .expect(200);
      expect(fetched.body).toEqual(response.body);
      expectSchema(fetched.body, orderSchema);
    },
  );

  it.each([
    'abc-1234',
    'AB-1234',
    'ABCD-1234',
    'ABC-123',
    'ABC-12345',
    'ABC1234',
    'ABC_1234',
    'ABC 1234',
    'ABC-12A4',
    '123-4567',
    'ABC-1234 ',
    ' ABC-1234',
    '',
    null,
    undefined,
    12345678,
    'ABC-1234\n',
    'ABC-1234\r',
    'ABC-1234\r\n',
    'АВС-1234',
    'ABC-１２３４',
    {},
    [],
    true,
  ])(
    'відхиляє %j → INVALID_SKU без нового або часткового замовлення',
    async (sku) => {
      const { app, auth } = context;
      const original = await request(app)
        .post('/orders')
        .set(auth)
        .send(makeOrderPayload())
        .expect(201);
      const response = await request(app)
        .post('/orders')
        .set(auth)
        .send({ items: [{ sku, price: 500, qty: 1 }] })
        .expect(400);
      expect(response.body).toEqual({ code: 'INVALID_SKU' });
      expect(response.headers['content-type']).toMatch(/^application\/json/);
      expect(response.headers.location).toBeUndefined();
      expect(
        (await request(app).get('/orders').set(auth).expect(200)).body,
      ).toEqual([original.body]);
    },
  );

  it('не зберігає жодної позиції багатопозиційного замовлення з одним хибним SKU', async () => {
    const { app, auth } = context;
    const response = await request(app)
      .post('/orders')
      .set(auth)
      .send({
        items: [
          { sku: 'ABC-1234', price: 100, qty: 1 },
          { sku: 'bad', price: 50, qty: 2 },
        ],
      })
      .expect(400);
    expect(response.body).toEqual({ code: 'INVALID_SKU' });
    expect(
      (await request(app).get('/orders').set(auth).expect(200)).body,
    ).toEqual([]);
  });

  it.each([undefined, 'Bearer fake'])(
    'створення валідного SKU без дійсної автентифікації %s → 401',
    async (header) => {
      const { app, auth } = context;
      const attempt = request(app).post('/orders');
      if (header) attempt.set('Authorization', header);
      expect((await attempt.send(makeOrderPayload()).expect(401)).body).toEqual(
        { code: 'UNAUTHORIZED' },
      );
      expect(
        (await request(app).get('/orders').set(auth).expect(200)).body,
      ).toEqual([]);
    },
  );

  it('валідний SKU не надає доступу до чужого замовлення', async () => {
    const { app, auth } = context;
    const created = await request(app)
      .post('/orders')
      .set(auth)
      .send(makeOrderPayload())
      .expect(201);
    const alice = await login(app, 'alice@example.com');
    for (const method of ['get', 'delete'] as const) {
      const client = request(app);
      const response = await client[method](created.headers.location)
        .auth(alice, { type: 'bearer' })
        .expect(404);
      expect(response.body).toEqual({ code: 'NOT_FOUND' });
    }
    expect(
      (await request(app).get(created.headers.location).set(auth).expect(200))
        .body,
    ).toEqual(created.body);
  });
});
