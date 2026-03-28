import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockIsNative = vi.fn();
const mockGetPlatform = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mockIsNative(),
    getPlatform: () => mockGetPlatform(),
  },
}));

describe('platform', () => {
  beforeEach(() => {
    vi.resetModules();
    mockIsNative.mockReturnValue(false);
    mockGetPlatform.mockReturnValue('web');
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('isNativeApp delegates to Capacitor', async () => {
    mockIsNative.mockReturnValue(true);
    const { isNativeApp } = await import('@utahwind/weather');
    expect(isNativeApp()).toBe(true);
  });

  it('isIOS is true only on ios platform', async () => {
    mockGetPlatform.mockReturnValue('ios');
    const { isIOS } = await import('@utahwind/weather');
    expect(isIOS()).toBe(true);
  });

  it('isAndroid is true only on android platform', async () => {
    mockGetPlatform.mockReturnValue('android');
    const { isAndroid } = await import('@utahwind/weather');
    expect(isAndroid()).toBe(true);
  });

  it('isWeb is true on web platform', async () => {
    mockGetPlatform.mockReturnValue('web');
    const { isWeb } = await import('@utahwind/weather');
    expect(isWeb()).toBe(true);
  });

  it('apiUrl returns relative path on web', async () => {
    mockIsNative.mockReturnValue(false);
    const { apiUrl } = await import('@utahwind/weather');
    expect(apiUrl('/api/foo')).toBe('/api/foo');
  });

  it('apiUrl prefixes origin on native', async () => {
    mockIsNative.mockReturnValue(true);
    const { apiUrl } = await import('@utahwind/weather');
    const u = apiUrl('/v1/x');
    expect(u).toMatch(/^https?:\/\//);
    expect(u).toContain('/v1/x');
  });
});
