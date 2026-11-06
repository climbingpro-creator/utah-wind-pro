import { describe, expect, it } from 'vitest';
import { flowScreenStep } from './flowScreen';

const SCALE = 0.001;
const SIZE = 1000;

describe('wind on a rotated map', () => {
  it('keeps an east wind moving east when the map is turned', () => {
    const flat = flowScreenStep(10, 0, { ex: 200, ey: 0, nx: 0, ny: -200 }, SIZE, SIZE, SCALE);
    const turned = flowScreenStep(10, 0, { ex: 0, ey: -200, nx: -200, ny: 0 }, SIZE, SIZE, SCALE);
    expect(flat.dx).toBeGreaterThan(0);
    expect(Math.abs(flat.dy)).toBeLessThan(0.01);
    expect(flat.dLng).toBeGreaterThan(0);
    expect(Math.abs(flat.dLat)).toBeLessThan(1e-9);
    expect(turned.dy).toBeLessThan(0);
    expect(turned.dLng).toBeCloseTo(flat.dLng, 6);
    expect(turned.dLat).toBeCloseTo(flat.dLat, 6);
  });

  it('keeps a south wind moving south when the map is turned', () => {
    const flat = flowScreenStep(0, 10, { ex: 200, ey: 0, nx: 0, ny: -200 }, SIZE, SIZE, SCALE);
    const turned = flowScreenStep(0, 10, { ex: 0, ey: -200, nx: -200, ny: 0 }, SIZE, SIZE, SCALE);
    expect(flat.dy).toBeGreaterThan(0);
    expect(flat.dLat).toBeLessThan(0);
    expect(turned.dLat).toBeCloseTo(flat.dLat, 6);
    expect(turned.dLng).toBeCloseTo(flat.dLng, 6);
  });
});
