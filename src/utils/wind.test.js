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

  it('returns N for north (explicit)', () => {
    expect(windDirectionToCardinal(2)).toBe('N');
  });

  it('returns E for east', () => {
    expect(windDirectionToCardinal(88)).toBe('E');
  });

  it('returns SE for 135°', () => {
    expect(windDirectionToCardinal(135)).toBe('SE');
  });

  it('returns W for west', () => {
    expect(windDirectionToCardinal(272)).toBe('W');
  });

  it('returns NW for 315°', () => {
    expect(windDirectionToCardinal(315)).toBe('NW');
  });

  it('handles values above 360 by modulo behavior of index', () => {
    expect(windDirectionToCardinal(450)).toBe('E');
  });

});
