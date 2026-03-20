import { describe, it, expect } from 'vitest';
import { windDirectionToCardinal } from './wind';

describe('windDirectionToCardinal', () => {
  it('returns N/A for null', () => {
    expect(windDirectionToCardinal(null)).toBe('N/A');
  });

  it('returns N/A for undefined', () => {
    expect(windDirectionToCardinal(undefined)).toBe('N/A');
  });

  it('returns N for 0 degrees', () => {
    expect(windDirectionToCardinal(0)).toBe('N');
  });

  it('returns E for 90 degrees', () => {
    expect(windDirectionToCardinal(90)).toBe('E');
  });

  it('returns S for 180 degrees', () => {
    expect(windDirectionToCardinal(180)).toBe('S');
  });

  it('returns W for 270 degrees', () => {
    expect(windDirectionToCardinal(270)).toBe('W');
  });

  it('returns N for 360 degrees', () => {
    expect(windDirectionToCardinal(360)).toBe('N');
  });

  it('returns NE for 45 degrees', () => {
    expect(windDirectionToCardinal(45)).toBe('NE');
  });

  it('returns SW for 225 degrees', () => {
    expect(windDirectionToCardinal(225)).toBe('SW');
  });
});
