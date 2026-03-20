import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config/lakeStations', () => ({
  LAKE_CONFIGS: {
    'utah-lake-zigzag': {
      thermal: { optimalDirection: { min: 135, max: 165 }, optimalSpeed: { min: 8, max: 18 } },
      stations: { groundTruth: { id: 'FPS' } },
    },
  },
}));
vi.mock('../utils/platform', () => ({ apiUrl: (p) => p }));

import {
  predictThermal,
  setLearnedWeights,
  setStatisticalModels,
  getDirectionInfo,
  formatTimeUntil,
  THERMAL_PROFILES,
} from './ThermalPredictor.js';

/** July 15, 2026 11:00 local — inside Utah Lake peak window */
function peakSummerMorning() {
  return new Date(2026, 6, 15, 11, 0, 0);
}

describe('ThermalPredictor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(peakSummerMorning());
    setLearnedWeights(null);
    setStatisticalModels(null);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('predictThermal', () => {
    it('returns null for unknown lakeId', () => {
      expect(predictThermal('not-a-lake', {})).toBeNull();
    });

    it('returns null when lakeId is null', () => {
      expect(predictThermal(null, {})).toBeNull();
    });

    it('returns null when lakeId is undefined', () => {
      expect(predictThermal(undefined, {})).toBeNull();
    });

    it('does not throw when currentConditions is null', () => {
      expect(() => predictThermal('utah-lake-zigzag', null)).not.toThrow();
      const r = predictThermal('utah-lake-zigzag', null);
      expect(r).not.toBeNull();
      expect(r.lakeId).toBe('utah-lake-zigzag');
    });

    it('does not throw when currentConditions is undefined', () => {
      expect(() => predictThermal('utah-lake-zigzag', undefined)).not.toThrow();
      const r = predictThermal('utah-lake-zigzag', undefined);
      expect(r.direction.status).toBe('unknown');
      expect(r.speed.status).toBe('unknown');
    });

    it('handles empty conditions without crashing', () => {
      const r = predictThermal('utah-lake-zigzag', {});
      expect(r).toMatchObject({
        lakeId: 'utah-lake-zigzag',
        phase: 'peak',
      });
      expect(r.direction.status).toBe('unknown');
      expect(r.speed.status).toBe('unknown');
      expect(r.pressure.status).toBe('unknown');
      expect(r.elevation.status).toBe('unknown');
    });

    it('marks optimal direction and good speed for classic SE thermal pattern', () => {
      const r = predictThermal('utah-lake-zigzag', {
        windDirection: 150,
        windSpeed: 10,
        pressureGradient: -1.0,
      });
      expect(r.direction.status).toBe('optimal');
      expect(r.direction.score).toBe(100);
      expect(r.speed.status).toBe('good');
      expect(r.speed.score).toBe(100);
      expect(r.pressure.status).toBe('favorable');
      expect(r.probability).toBe(72);
      expect(r.prediction.willHaveThermal).toBe(true);
    });

    it('forces probability to 0 when pressure gradient strongly favors north flow (SE thermal)', () => {
      const r = predictThermal('utah-lake-zigzag', {
        windDirection: 150,
        windSpeed: 10,
        pressureGradient: 3.0,
      });
      expect(r.pressure.status).toBe('bust');
      expect(r.probability).toBe(0);
      expect(r.prediction.message).toMatch(/Pressure gradient|0%/);
    });

    it('sets probability to 0 when daily thermal window has ended', () => {
      vi.setSystemTime(new Date(2026, 6, 15, 20, 0, 0));
      const r = predictThermal('utah-lake-zigzag', {
        windDirection: 150,
        windSpeed: 10,
      });
      expect(r.phase).toBe('ended');
      expect(r.probability).toBe(0);
    });

    it('blends in statistical model hourly probability when set', () => {
      setStatisticalModels({
        thermalProfiles: {
          'utah-lake-zigzag': {
            hourlyProbability: { 11: 50 },
          },
        },
      });
      const r = predictThermal('utah-lake-zigzag', {
        windDirection: 150,
        windSpeed: 10,
        pressureGradient: -1.0,
      });
      expect(r.probability).toBeGreaterThan(72);
      expect(r.probability).toBeLessThanOrEqual(95);
    });

    it('applies Spanish Fork early indicator for Utah Lake when SE wind is strong', () => {
      const r = predictThermal('utah-lake-zigzag', {
        spanishForkWind: { speed: 8, direction: 140 },
      });
      expect(r.spanishFork.status).toBe('strong');
      expect(r.spanishFork.eta).toBe(120);
    });

    it('applies north flow indicator when KSLC shows strong north wind', () => {
      const r = predictThermal('utah-lake-zigzag', {
        kslcWind: { speed: 12, direction: 350 },
      });
      expect(r.northFlow.status).toBe('strong');
      expect(r.northFlow.expectedZigZagSpeed).toBe(15.5);
    });

    it('scores Deer Creek arrowhead trigger when ridge wind matches SSW optimal', () => {
      vi.setSystemTime(new Date(2026, 7, 1, 13, 0, 0));
      const r = predictThermal('deer-creek', {
        ridgeWindSpeed: 14,
        ridgeWindDirection: 210,
      });
      expect(r.arrowhead).not.toBeNull();
      expect(r.arrowhead.status).toBe('trigger');
    });

    it('uses thermal delta optimal band for Deer Creek', () => {
      vi.setSystemTime(new Date(2026, 7, 1, 13, 0, 0));
      const r = predictThermal('deer-creek', {
        thermalDelta: 10,
      });
      expect(r.elevation.status).toBe('optimal');
      expect(r.elevation.score).toBe(100);
    });
  });

  describe('setLearnedWeights / setStatisticalModels', () => {
    it('setLearnedWeights toggles learned mode when version is not default', () => {
      setLearnedWeights({
        version: 'v-test',
        pressureWeight: 0.4,
        thermalWeight: 0.4,
        convergenceWeight: 0.2,
      });
      const r = predictThermal('utah-lake-zigzag', {});
      expect(r.isUsingLearnedWeights).toBe(true);
      expect(r.weightsVersion).toBe('v-test');
    });
  });

  describe('getDirectionInfo', () => {
    it('returns N/A for null/undefined', () => {
      expect(getDirectionInfo(null)).toEqual({ cardinal: 'N/A', arrow: '?' });
      expect(getDirectionInfo(undefined)).toEqual({ cardinal: 'N/A', arrow: '?' });
    });

    it('returns SE for 150°', () => {
      const info = getDirectionInfo(150);
      expect(info.cardinal).toBe('SE');
    });
  });

  describe('formatTimeUntil', () => {
    it('returns null for null, undefined, or non-positive', () => {
      expect(formatTimeUntil(null)).toBeNull();
      expect(formatTimeUntil(undefined)).toBeNull();
      expect(formatTimeUntil(0)).toBeNull();
      expect(formatTimeUntil(-5)).toBeNull();
    });

    it('formats minutes and hours', () => {
      expect(formatTimeUntil(45)).toBe('45 min');
      expect(formatTimeUntil(60)).toBe('1h');
      expect(formatTimeUntil(90)).toBe('1h 30m');
    });
  });

  describe('THERMAL_PROFILES', () => {
    it('includes utah-lake-zigzag and deer-creek', () => {
      expect(THERMAL_PROFILES['utah-lake-zigzag']).toBeDefined();
      expect(THERMAL_PROFILES['deer-creek']).toBeDefined();
    });
  });
});
