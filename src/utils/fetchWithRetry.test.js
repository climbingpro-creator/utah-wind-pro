import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from './fetchWithRetry';

describe('fetchWithRetry', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  it('returns response on successful fetch', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    const resp = await fetchWithRetry('https://example.com/api');
    expect(resp.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 error and eventually returns last response', async () => {
    const error500 = { ok: false, status: 500 };
    globalThis.fetch = vi.fn().mockResolvedValue(error500);

    const resp = await fetchWithRetry('https://example.com/api', {}, { retries: 2, baseDelay: 10 });
    expect(resp.status).toBe(500);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 400 error', async () => {
    const error400 = { ok: false, status: 400 };
    globalThis.fetch = vi.fn().mockResolvedValue(error400);

    const resp = await fetchWithRetry('https://example.com/api', {}, { retries: 2, baseDelay: 10 });
    expect(resp.status).toBe(400);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on network error and throws after exhausting retries', async () => {
    const netError = new Error('Network failure');
    globalThis.fetch = vi.fn().mockRejectedValue(netError);

    await expect(
      fetchWithRetry('https://example.com/api', {}, { retries: 1, baseDelay: 10 })
    ).rejects.toThrow('Network failure');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('succeeds on retry after initial 500', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const resp = await fetchWithRetry('https://example.com/api', {}, { retries: 2, baseDelay: 10 });
    expect(resp.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
