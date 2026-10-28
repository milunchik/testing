import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { setup, makeOrderPayload } from './helpers';
import { expectSchema } from './schema';
import { orderSchema } from './schemas/order.schema';
import { server } from './msw/server';

beforeAll(() => server.close());

describe('JSON Schema — публічний контракт', () => {
  let order: Record<string, unknown>;
  beforeEach(async () => {
    const { app, auth } = await setup();
    const response = await request(app)
      .post('/orders')
      .set(auth)
      .send(makeOrderPayload())
      .expect(201);
    order = response.body;
  });

  it('приймає фактичну відповідь API', () => {
    expectSchema(order, orderSchema);
  });

  it.each(['id', 'tier', 'subtotal', 'total', 'createdAt', 'items'])(
    'відхиляє відсутнє обов’язкове поле %s',
    (key) => {
      delete order[key];
      const ajv = new Ajv({ allErrors: true });
      addFormats(ajv);
      const validate = ajv.compile(orderSchema);
      expect(validate(order)).toBe(false);
      expect(validate.errors).toContainEqual(
        expect.objectContaining({
          keyword: 'required',
          params: { missingProperty: key },
        }),
      );
    },
  );

  it.each([
    { id: 12 },
    { id: 'not-a-uuid' },
    { tier: 'platinum' },
    { subtotal: -1 },
    { subtotal: '500' },
    { total: -1 },
    { createdAt: 'yesterday' },
    { items: [] },
    { items: [{ sku: 'ABC-1234', price: -1, qty: 1 }] },
    { items: [{ sku: 'ABC-1234', price: 1, qty: 0 }] },
    { items: [{ sku: 'ABC-1234', price: 1, qty: 1.5 }] },
    { items: [{ sku: 'abc-1234', price: 1, qty: 1 }] },
    { items: [{ sku: 'ABC-1234\n', price: 1, qty: 1 }] },
    { items: [{ price: 1, qty: 1 }] },
    { items: [{ sku: 'ABC-1234', price: 1 }] },
    { items: [{ sku: 'ABC-1234', qty: 1 }] },
    { ownerId: 'u2' },
    { items: [{ sku: 'ABC-1234', price: 1, qty: 1, ownerId: 'u2' }] },
  ])('відхиляє порушення контракту %j', (change) => {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(orderSchema);
    expect(validate({ ...order, ...change })).toBe(false);
    expect(validate.errors?.length).toBeGreaterThan(0);
  });

  it('ownerId викликає точну помилку additionalProperties', () => {
    const ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(orderSchema);
    expect(validate({ ...order, ownerId: 'u2' })).toBe(false);
    expect(validate.errors).toEqual([
      {
        instancePath: '',
        schemaPath: '#/additionalProperties',
        keyword: 'additionalProperties',
        params: { additionalProperty: 'ownerId' },
        message: 'must NOT have additional properties',
      },
    ]);
  });
});
