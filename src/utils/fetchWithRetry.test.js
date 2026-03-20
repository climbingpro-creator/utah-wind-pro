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

  it('succeeds on first try with ok true', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 201, json: async () => ({}) });

    const resp = await fetchWithRetry('/api/x', { method: 'GET' }, { retries: 1, baseDelay: 5 });
    expect(resp.ok).toBe(true);
    expect(resp.status).toBe(201);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/x', { method: 'GET' });
  });

  it('retries on network error then succeeds', async () => {
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const p = fetchWithRetry('https://example.com/api', {}, { retries: 2, baseDelay: 10 });
    await vi.runAllTimersAsync();
    const resp = await p;
    expect(resp.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws last error when network failures exceed retries', async () => {
    const err = new Error('offline');
    globalThis.fetch = vi.fn().mockRejectedValue(err);

    const p = fetchWithRetry('https://example.com/api', {}, { retries: 2, baseDelay: 10 });
    const assertion = expect(p).rejects.toThrow('offline');
    await vi.runAllTimersAsync();
    await assertion;
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('400 does not retry and returns response immediately (does not throw)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: 'Bad Request' });

    const resp = await fetchWithRetry('https://example.com/api', {}, { retries: 3, baseDelay: 10 });
    expect(resp.status).toBe(400);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 then succeeds', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const p = fetchWithRetry('https://example.com/api', {}, { retries: 2, baseDelay: 10 });
    await vi.runAllTimersAsync();
    const resp = await p;
    expect(resp.ok).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('after max retries on 502 returns last non-ok response', async () => {
    const bad = { ok: false, status: 502 };
    globalThis.fetch = vi.fn().mockResolvedValue(bad);

    const p = fetchWithRetry('https://example.com/api', {}, { retries: 1, baseDelay: 10 });
    await vi.runAllTimersAsync();
    const resp = await p;
    expect(resp.status).toBe(502);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
