import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/trainedWeights-boating.json', () => ({
  default: {
    weights: {
      version: 'test',
      hourlyMultipliers: {},
      monthlyQualityRates: {},
      probabilityCalibration: {},
      glassWindowByHour: {},
    },
  },
}));

import { predictGlass } from './BoatingPredictor';

describe('predictGlass', () => {
  it('returns high glass probability for calm conditions', () => {
    const result = predictGlass({ speed: 0, gust: 0 }, { gradient: 0.1 });

    expect(result.probability).toBeGreaterThan(60);
    expect(result.isGlass).toBe(true);
    expect(result.isCalm).toBe(true);
    expect(result.waveEstimate).toBe('flat');
  });

  it('returns low glass probability for windy conditions', () => {
    const result = predictGlass({ speed: 20, gust: 28 }, { gradient: 2.5 });

    expect(result.probability).toBeLessThan(30);
    expect(result.isGlass).toBe(false);
    expect(result.isCalm).toBe(false);
    expect(result.waveEstimate).toBe('rough');
  });

  it('does not crash with null windData', () => {
    const result = predictGlass(null);
    expect(result).toHaveProperty('probability');
    expect(result).toHaveProperty('waveEstimate');
  });

  it('does not crash with undefined windData', () => {
    const result = predictGlass(undefined);
    expect(typeof result.probability).toBe('number');
  });

  it('does not crash with empty objects', () => {
    const result = predictGlass({}, {});
    expect(typeof result.probability).toBe('number');
    expect(result.waveEstimate).toBe('unknown');
  });

  it('result has expected shape', () => {
    const result = predictGlass({ speed: 5, gust: 7 });
    expect(result).toHaveProperty('probability');
    expect(result).toHaveProperty('waveEstimate');
    expect(result).toHaveProperty('waveLabel');
    expect(result).toHaveProperty('gustFactor');
    expect(result).toHaveProperty('glassWindow');
    expect(result).toHaveProperty('isGlass');
    expect(result).toHaveProperty('isCalm');
    expect(result).toHaveProperty('recommendation');
  });

  it('returns ripples wave estimate for light wind', () => {
    const result = predictGlass({ speed: 4, gust: 5 }, { gradient: 0.2 });
    expect(result.waveEstimate).toBe('ripples');
    expect(result.isCalm).toBe(true);
  });

  it('probability is clamped between 0 and 95', () => {
    const calm = predictGlass({ speed: 0, gust: 0 }, { gradient: 0 });
    expect(calm.probability).toBeLessThanOrEqual(95);
    expect(calm.probability).toBeGreaterThanOrEqual(0);

    const windy = predictGlass({ speed: 40, gust: 55 }, { gradient: 5 });
    expect(windy.probability).toBeLessThanOrEqual(95);
    expect(windy.probability).toBeGreaterThanOrEqual(0);
  });
});
