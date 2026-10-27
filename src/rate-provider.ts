import type { RateProvider } from './order-service';

export class HttpRateProvider implements RateProvider {
  constructor(private baseUrl: string) {}

  async getRate(from: string, to: string): Promise<number> {
    const url = new URL(`${this.baseUrl}/rate`);
    url.search = new URLSearchParams({ from, to }).toString();
    const response = await fetch(url);
    if (!response.ok) throw new Error('RATE_UNAVAILABLE');

    let data: unknown;
    try {
      data = await response.json();
    } catch (cause) {
      throw new Error('INVALID_RATE_FORMAT', { cause });
    }
    if (
      typeof data !== 'object' ||
      data === null ||
      !('rate' in data) ||
      typeof data.rate !== 'number' ||
      !Number.isFinite(data.rate) ||
      data.rate <= 0
    ) {
      throw new Error('INVALID_RATE_FORMAT');
    }
    return data.rate;
  }
}
