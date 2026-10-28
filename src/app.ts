import express from 'express';
import { randomUUID } from 'node:crypto';
import {
  calcDiscountRate,
  calcShipping,
  type OrderItem,
  type Tier,
} from './order';

interface User {
  id: string;
  email: string;
  password: string;
  tier: Tier;
}

interface Order {
  id: string;
  ownerId: string;
  tier: Tier;
  items: OrderItem[];
  subtotal: number;
  total: number;
  createdAt: string;
}

// Fixed educational accounts from the laboratory methodology, for local use only.
const USERS: readonly User[] = [
  { id: 'u1', email: 'alice@example.com', password: 'Secret123', tier: 'gold' },
  { id: 'u2', email: 'bob@example.com', password: 'Secret123', tier: 'basic' },
];
const round2 = (value: number) => Math.round(value * 100) / 100;
const SKU_PATTERN = /^[A-Z]{3}-[0-9]{4}$/;

function toPublic(order: Order): Omit<Order, 'ownerId'> {
  return {
    id: order.id,
    tier: order.tier,
    items: order.items,
    subtotal: order.subtotal,
    total: order.total,
    createdAt: order.createdAt,
  };
}

export function createApp() {
  const app = express();
  const tokens = new Map<string, User>();
  const orders = new Map<string, Order>();
  app.use(express.json());

  app.post('/auth/login', (req, res) => {
    const user = USERS.find(
      (candidate) =>
        candidate.email === req.body?.email &&
        candidate.password === req.body?.password,
    );
    if (!user) return res.status(401).json({ code: 'INVALID_CREDENTIALS' });
    const token = randomUUID();
    tokens.set(token, user);
    return res.json({ accessToken: token });
  });

  app.use('/orders', (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization ?? '');
    const user = match ? tokens.get(match[1]) : undefined;
    if (!user) return res.status(401).json({ code: 'UNAUTHORIZED' });
    res.locals.user = user;
    return next();
  });

  app.post('/orders', (req, res) => {
    const input: unknown = req.body?.items;
    if (!Array.isArray(input) || input.length === 0) {
      return res.status(400).json({ code: 'EMPTY_ORDER' });
    }
    const items: OrderItem[] = [];
    for (const item of input) {
      if (
        typeof item?.price !== 'number' ||
        !Number.isFinite(item.price) ||
        item.price < 0
      ) {
        return res.status(400).json({ code: 'INVALID_PRICE' });
      }
      if (!Number.isInteger(item.qty) || item.qty <= 0) {
        return res.status(400).json({ code: 'INVALID_QTY' });
      }
      // Length also rejects a final newline, which JavaScript's $ can match before.
      if (
        typeof item.sku !== 'string' ||
        item.sku.length !== 8 ||
        !SKU_PATTERN.test(item.sku)
      ) {
        return res.status(400).json({ code: 'INVALID_SKU' });
      }
      items.push({ sku: item.sku, price: item.price, qty: item.qty });
    }
    const user: User = res.locals.user;
    const subtotal = round2(
      items.reduce((sum, item) => sum + item.price * item.qty, 0),
    );
    if (!Number.isFinite(subtotal)) {
      return res.status(400).json({ code: 'INVALID_PRICE' });
    }
    const rate = calcDiscountRate(user.tier, subtotal);
    const afterDiscount = round2(subtotal * (1 - rate));
    const total = round2(afterDiscount + calcShipping(afterDiscount));
    const order: Order = {
      id: randomUUID(),
      ownerId: user.id,
      tier: user.tier,
      items,
      subtotal,
      total,
      createdAt: new Date().toISOString(),
    };
    orders.set(order.id, order);
    return res
      .status(201)
      .location(`/orders/${order.id}`)
      .json(toPublic(order));
  });

  app.get('/orders', (_req, res) => {
    const user: User = res.locals.user;
    const mine = [...orders.values()].filter(
      (order) => order.ownerId === user.id,
    );
    return res.json(mine.map(toPublic));
  });

  app.get('/orders/:id', (req, res) => {
    const user: User = res.locals.user;
    const order = orders.get(req.params.id);
    if (!order || order.ownerId !== user.id) {
      return res.status(404).json({ code: 'NOT_FOUND' });
    }
    return res.json(toPublic(order));
  });

  app.delete('/orders/:id', (req, res) => {
    const user: User = res.locals.user;
    const order = orders.get(req.params.id);
    if (!order || order.ownerId !== user.id) {
      return res.status(404).json({ code: 'NOT_FOUND' });
    }
    orders.delete(order.id);
    return res.status(204).end();
  });

  return app;
}
