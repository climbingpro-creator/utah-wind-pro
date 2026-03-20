import { describe, it, expect } from 'vitest';
import { safeToFixed } from './safeToFixed.js';

describe('safeToFixed', () => {
  it('formats normal numbers', () => {
    expect(safeToFixed(3.14159, 2)).toBe('3.14');
    expect(safeToFixed(42, 0)).toBe('42');
    expect(safeToFixed(-7.5, 1)).toBe('-7.5');
  });

  it('returns "--" for null, undefined, and NaN', () => {
    expect(safeToFixed(null)).toBe('--');
    expect(safeToFixed(undefined)).toBe('--');
    expect(safeToFixed(NaN)).toBe('--');
  });

  it('coerces string numbers', () => {
    expect(safeToFixed('12.345', 2)).toBe('12.35');
    expect(safeToFixed('0', 0)).toBe('0');
  });

  it('respects digit precision', () => {
    expect(safeToFixed(1, 4)).toBe('1.0000');
    expect(safeToFixed(9.8765, 3)).toBe('9.877');
  });
});
