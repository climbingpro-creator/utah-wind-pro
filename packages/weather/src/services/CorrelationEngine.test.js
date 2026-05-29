import { describe, it, expect, vi } from 'vitest';

// IMPORTANT: This mock must include ALL top-level registry keys that any
// module reached via the @utahwind/weather barrel touches at module-load
// time. FrontalTrendPredictor reads SWING_MONITOR.alerts at load — if you
// omit it the entire suite fails with "0 tests" before any test runs.
// (FrontalTrendPredictor now has defensive defaults, so this mock would
//  work without SWING_MONITOR, but keeping it correct is good hygiene.)
vi.mock('../config/mesoRegistry.json', () => ({
  default: {
    RELATIONS: {
      'utah-lake-zigzag': {
        name: 'Saratoga Springs / Zig Zag',
        thermal_engine: {
          generator: 'GREAT_SALT_LAKE',
          upstream_gate: 'KSLC',
          indicator_type: 'GSL_SURGE',
          min_temp_delta: 8,
          wind_heading: [280, 360],
          min_speed: 8,
          multiplier: 1.25,
        },
        canyon_boost: {
          gate_sensor: 'QSF',
          heading: [100, 180],
          speed_range: [6, 18],
          multiplier: 1.15,
        },
      },
    },
    SWING_MONITOR: {
      front_trigger_3h: 10,
      front_trigger_1h: 5,
      pressure_trigger_3h: 0.04,
      pressure_trigger_1h: 0.02,
      gust_spike_threshold: 15,
      alerts: {
        FRONTAL_HIT:   { message: 'Frontal hit',     wind_expectation: 'N surge', severity: 'critical' },
        PRESSURE_BOMB: { message: 'Pressure surge',  wind_expectation: 'NW gusty', severity: 'warning' },
        WIND_SHIFT:    { message: 'Wind shift',      wind_expectation: 'Frontal',  severity: 'warning', direction_change_1h: 90 },
      },
    },
  },
}));

import { calculateCorrelatedWind } from '@utahwind/weather';

describe('calculateCorrelatedWind', () => {
  it('returns baseline when lakeId has no config', () => {
    const base = { speed: 10 };
    const result = calculateCorrelatedWind('unknown-lake', base, {});

    expect(result.refinedSpeed).toBe(10);
    expect(result.multiplier).toBe(1.0);
    expect(result.activeTriggers).toEqual([]);
    expect(result.spatialConfidence).toBe('standard');
  });

  it('returns baseline when baseForecast is null', () => {
    const result = calculateCorrelatedWind('utah-lake-zigzag', null, {});
    expect(result.refinedSpeed).toBeNull();
    expect(result.activeTriggers).toEqual([]);
  });

  it('applies GSL surge multiplier when upstream KSLC confirms NW flow with temp delta', () => {
    const base = { speed: 10 };
    const mesoData = {
      KSLC: { speed: 12, direction: 310, temperature: 50 },
      FPS: { speed: 8, direction: 300, temperature: 60 },
    };

    const result = calculateCorrelatedWind('utah-lake-zigzag', base, mesoData);

    expect(result.multiplier).toBeGreaterThan(1.0);
    expect(result.refinedSpeed).toBeGreaterThan(10);
    const gslTrigger = result.activeTriggers.find((t) => t.id === 'gsl-surge');
    expect(gslTrigger).toBeDefined();
    expect(result.spatialConfidence).not.toBe('standard');
  });

  it('applies canyon boost when QSF shows SE drainage', () => {
    const base = { speed: 10 };
    const mesoData = {
      QSF: { speed: 10, direction: 140 },
    };

    const result = calculateCorrelatedWind('utah-lake-zigzag', base, mesoData);

    const canyonTrigger = result.activeTriggers.find((t) => t.id === 'canyon-boost');
    expect(canyonTrigger).toBeDefined();
    expect(result.multiplier).toBeGreaterThan(1.0);
  });

  it('returns standard confidence with no matching mesoData', () => {
    const base = { speed: 10 };
    const result = calculateCorrelatedWind('utah-lake-zigzag', base, {});

    expect(result.multiplier).toBe(1.0);
    expect(result.activeTriggers).toHaveLength(0);
    expect(result.spatialConfidence).toBe('standard');
    expect(result.refinedSpeed).toBe(10);
  });

  it('handles empty mesoData object', () => {
    const base = { speed: 5, expectedSpeed: 8 };
    const result = calculateCorrelatedWind('utah-lake-zigzag', base, {});

    expect(result.refinedSpeed).toBe(5);
    expect(result.baseSpeed).toBe(5);
  });

  it('falls back to expectedSpeed when speed is missing', () => {
    const base = { expectedSpeed: 12 };
    const result = calculateCorrelatedWind('utah-lake-zigzag', base, {});

    expect(result.refinedSpeed).toBe(12);
    expect(result.baseSpeed).toBe(12);
  });
});
