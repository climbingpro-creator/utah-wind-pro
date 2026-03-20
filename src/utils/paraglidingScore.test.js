import { describe, it, expect } from 'vitest';
import { getParaglidingScore } from './paraglidingScore.js';

describe('getParaglidingScore', () => {
  it('handles null / missing stations', () => {
    const r = getParaglidingScore(null, undefined);
    expect(r.score).toBe(0);
    expect(r.message).toBe('No data from Flight Park stations');
    expect(r.bestSite).toBe('Flight Park South');
  });

  it('scores excellent FPS conditions for SE wind ~10 mph', () => {
    const fps = { direction: 160, windSpeed: 10 };
    const utalp = { direction: 200, windSpeed: 5 };
    const r = getParaglidingScore(fps, utalp);
    expect(r.bestSite).toBe('Flight Park South');
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.message).toMatch(/Excellent at Flight Park South/i);
    expect(r.message).toMatch(/10/);
  });

  it('scores excellent UTALP conditions for N wind ~14 mph when FPS is weak', () => {
    const fps = { direction: 50, speed: 4 };
    const utalp = { direction: 360, windSpeed: 14 };
    const r = getParaglidingScore(fps, utalp);
    expect(r.bestSite).toBe('Flight Park North');
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.message).toMatch(/Excellent at Flight Park North/i);
  });

  it('returns marginal message when scores stay below flyable threshold', () => {
    const fps = { direction: 95, windSpeed: 4 };
    const utalp = { direction: 120, windSpeed: 3 };
    const r = getParaglidingScore(fps, utalp);
    expect(r.score).toBeLessThan(50);
    expect(r.message).toMatch(/^Marginal/i);
  });
});
