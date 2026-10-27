import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withRetry } from '../src/retry';

describe('withRetry — підміна таймерів', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('успіх першої спроби не створює таймерів', async () => {
    const action = vi.fn().mockResolvedValue('ok');
    await expect(withRetry(action)).resolves.toBe('ok');
    expect(action).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('чекає рівно 1000 мс перед успішною повторною спробою', async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('TIMEOUT'))
      .mockResolvedValueOnce('ok');
    const promise = withRetry(action);
    await vi.advanceTimersByTimeAsync(999);
    expect(action).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe('ok');
    expect(action).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('три відмови: дві затримки та саме остання помилка', async () => {
    const last = new Error('LAST_ERROR');
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('FIRST'))
      .mockRejectedValueOnce(new Error('SECOND'))
      .mockRejectedValueOnce(last);
    const promise = withRetry(action);
    const assertion = expect(promise).rejects.toBe(last);
    await vi.advanceTimersByTimeAsync(1000);
    expect(action).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(999);
    expect(action).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    await assertion;
    expect(action).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('поширює помилку без затримки за однієї спроби', async () => {
    const action = vi.fn().mockRejectedValue(new Error('TIMEOUT'));
    await expect(withRetry(action, 1)).rejects.toThrow('TIMEOUT');
    expect(action).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('використовує задані кількість спроб і затримку', async () => {
    const action = vi
      .fn()
      .mockRejectedValueOnce(new Error('TIMEOUT'))
      .mockResolvedValueOnce(12);
    const promise = withRetry(action, 2, 250);
    await vi.advanceTimersByTimeAsync(249);
    expect(action).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(promise).resolves.toBe(12);
    expect(action).toHaveBeenCalledTimes(2);
  });
});
