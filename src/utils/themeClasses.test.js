import { describe, it, expect } from 'vitest';
import { themeClasses, tc } from './themeClasses';

describe('themeClasses', () => {
  const keys = Object.keys(themeClasses).filter((k) => typeof themeClasses[k] === 'function');

  it('exports helpers for light and dark', () => {
    expect(keys.length).toBeGreaterThan(5);
    for (const key of keys) {
      const light = themeClasses[key]('light');
      const dark = themeClasses[key]('dark');
      expect(typeof light).toBe('string');
      expect(typeof dark).toBe('string');
      expect(light.length).toBeGreaterThan(0);
      expect(dark.length).toBeGreaterThan(0);
    }
  });

  it('card differs between themes', () => {
    expect(themeClasses.card('light')).not.toBe(themeClasses.card('dark'));
  });

  it('textPrimary differs between themes', () => {
    expect(themeClasses.textPrimary('light')).toContain('slate');
    expect(themeClasses.textPrimary('dark')).toContain('white');
  });

  it('success and successBg are paired strings', () => {
    expect(themeClasses.success('dark')).toMatch(/green/);
    expect(themeClasses.successBg('light')).toMatch(/green/);
  });

  it('warning and danger use distinct palettes', () => {
    expect(themeClasses.warning('light')).not.toBe(themeClasses.danger('light'));
    expect(themeClasses.warning('dark')).not.toBe(themeClasses.danger('dark'));
  });

  it('buttonPrimary references cyan', () => {
    expect(themeClasses.buttonPrimary('light')).toMatch(/cyan/);
    expect(themeClasses.buttonPrimary('dark')).toMatch(/cyan/);
  });
});

describe('tc', () => {
  it('joins known keys into one string', () => {
    const s = tc('dark', 'card', 'textPrimary');
    expect(s).toContain('bg-slate');
    expect(s).toContain('text-white');
  });

  it('passes through raw class fragments', () => {
    expect(tc('light', 'p-4', 'm-2')).toBe('p-4 m-2');
  });

  it('accepts inline functions', () => {
    const s = tc('dark', (t) => (t === 'dark' ? 'x' : 'y'));
    expect(s).toBe('x');
  });

  it('mixes keys and functions', () => {
    const s = tc('light', 'border', (t) => `theme-${t}`);
    expect(s).toContain('border-slate');
    expect(s).toContain('theme-light');
  });
});
