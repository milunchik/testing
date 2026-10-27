import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderService } from '../src/order-service';
import { InMemoryOrderRepository } from './fakes/in-memory-repository';

const order = { id: 'A-12', amountUsd: 10, email: 'client@example.com' };
const timestamp = '2026-03-15T10:00:00.000Z';

describe('OrderService — заглушки, шпигуни та підробка', () => {
  const rates = { getRate: vi.fn<() => Promise<number>>() };
  const notifier = { send: vi.fn<() => Promise<void>>() };
  let repo: InMemoryOrderRepository;
  let service: OrderService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(timestamp));
    rates.getRate.mockReset().mockResolvedValue(41);
    notifier.send.mockReset().mockResolvedValue(undefined);
    repo = new InMemoryOrderRepository();
    service = new OrderService(rates, repo, notifier);
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    [100, 4100],
    [10, 410],
    [1.234, 50.59],
  ])(
    'конвертує %s USD у %s UAH та округлює копійки',
    async (amountUsd, expected) => {
      expect(
        (await service.placeOrder({ ...order, amountUsd })).amountUah,
      ).toBe(expected);
      expect(rates.getRate).toHaveBeenCalledWith('USD', 'UAH');
    },
  );
  it('надсилає одне сповіщення з точними аргументами', async () => {
    await service.placeOrder(order);
    expect(notifier.send).toHaveBeenCalledTimes(1);
    expect(notifier.send).toHaveBeenCalledWith(
      'client@example.com',
      'Замовлення A-12 на суму 410 грн прийнято',
    );
  });
  it('записує фіксований момент створення', async () => {
    expect((await service.placeOrder(order)).createdAt).toBe(timestamp);
  });
  it('стан: збережене замовлення можна прочитати зі сховища', async () => {
    const record = await service.placeOrder(order);
    expect(record).toEqual({ ...order, amountUah: 410, createdAt: timestamp });
    expect(await repo.findById('A-12')).toEqual({
      ...order,
      amountUah: 410,
      createdAt: timestamp,
    });
    expect(repo.size).toBe(1);
    expect(await repo.findById('missing')).toBeUndefined();
  });
  it('взаємодія: викликає save рівно один раз з правильним записом', async () => {
    const spy = {
      save: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
    };
    await new OrderService(rates, spy, notifier).placeOrder(order);
    expect(spy.save).toHaveBeenCalledTimes(1);
    expect(spy.save).toHaveBeenCalledWith({
      ...order,
      amountUah: 410,
      createdAt: timestamp,
    });
  });
  it.each([0, -1, NaN, Infinity, -Infinity])(
    'відхиляє суму %s без побічних ефектів',
    async (amountUsd) => {
      const spy = { save: vi.fn(), findById: vi.fn() };
      await expect(
        new OrderService(rates, spy, notifier).placeOrder({
          ...order,
          amountUsd,
        }),
      ).rejects.toThrow('INVALID_AMOUNT');
      expect(rates.getRate).not.toHaveBeenCalled();
      expect(spy.save).not.toHaveBeenCalled();
      expect(notifier.send).not.toHaveBeenCalled();
      expect(repo.size).toBe(0);
    },
  );
  it('відмова курсу: не зберігає замовлення й не надсилає листа', async () => {
    rates.getRate.mockRejectedValue(new Error('RATE_UNAVAILABLE'));
    await expect(service.placeOrder(order)).rejects.toThrow('RATE_UNAVAILABLE');
    expect(repo.size).toBe(0);
    expect(notifier.send).not.toHaveBeenCalled();
  });
  it('відмова сховища: не надсилає листа', async () => {
    const broken = {
      save: vi.fn().mockRejectedValue(new Error('SAVE_FAILED')),
      findById: vi.fn(),
    };
    await expect(
      new OrderService(rates, broken, notifier).placeOrder(order),
    ).rejects.toThrow('SAVE_FAILED');
    expect(notifier.send).not.toHaveBeenCalled();
  });
  it('відмова сповіщення: вже збережений запис залишається', async () => {
    notifier.send.mockRejectedValue(new Error('NOTIFICATION_FAILED'));
    await expect(service.placeOrder(order)).rejects.toThrow(
      'NOTIFICATION_FAILED',
    );
    expect((await repo.findById('A-12'))?.amountUah).toBe(410);
    expect(repo.size).toBe(1);
  });
});
