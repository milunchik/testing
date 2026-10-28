import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../src/app';

export async function login(app: Express, email: string): Promise<string> {
  const response = await request(app)
    .post('/auth/login')
    .send({ email, password: 'Secret123' });
  if (response.status !== 200) {
    throw new Error(`login failed: ${response.status}`);
  }
  return response.body.accessToken;
}

export function makeOrderPayload(overrides: Partial<{ items: unknown }> = {}) {
  return { items: [{ sku: 'SKU-0001', price: 500, qty: 1 }], ...overrides };
}

export async function setup(email = 'bob@example.com') {
  const app = createApp();
  const token = await login(app, email);
  return { app, token, auth: { Authorization: `Bearer ${token}` } };
}
