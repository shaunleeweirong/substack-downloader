import { RATE_LIMIT_DELAY_MS } from '../constants';

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rateLimitedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  await delay(RATE_LIMIT_DELAY_MS);
  return fetch(url, options);
}

export class RateLimiter {
  private lastRequestTime = 0;
  private minDelay: number;

  constructor(minDelayMs: number = RATE_LIMIT_DELAY_MS) {
    this.minDelay = minDelayMs;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelay) {
      await delay(this.minDelay - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    await this.wait();
    return fetch(url, options);
  }
}
