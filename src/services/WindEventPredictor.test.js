import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/lakeStations', () => ({
  LAKE_CONFIGS: {
    'utah-lake-zigzag': {
      id: 'utah-lake-zigzag',
      name: 'Zigzag Island',
      thermal: { optimalDirection: { min: 135, max: 165 }, optimalSpeed: { min: 8, max: 18 } },
      stations: { groundTruth: { id: 'FPS' } },
    },
  },
}));

vi.mock('../utils/platform', () => ({ apiUrl: (p) => p }));

import { predictWindEvents } from './WindEventPredictor';

describe('predictWindEvents', () => {
  it('returns empty array for unknown lake', () => {
    const events = predictWindEvents('nonexistent-lake', {}, {});
    expect(events).toEqual([]);
  });

  it('detects north flow with strong gradient and NW wind', () => {
    const conditions = { windSpeed: 15, windDirection: 330, windGust: 20, temperature: 25 };
    const pressure = { gradient: 3.0, trend: 'stable', slcPressure: 1020, pvuPressure: 1017 };

    const events = predictWindEvents('utah-lake-zigzag', conditions, pressure);
    const northFlow = events.find((e) => e.id === 'north_flow');

    expect(northFlow).toBeDefined();
    expect(northFlow.probability).toBeGreaterThan(20);
    expect(northFlow.details.length).toBeGreaterThan(0);
  });

  it('detects glass/calm with low speed and low gradient', () => {
    const conditions = { windSpeed: 2, windDirection: 180, windGust: 3 };
    const pressure = { gradient: 0.3, trend: 'stable' };

    const events = predictWindEvents('utah-lake-zigzag', conditions, pressure);
    const glass = events.find((e) => e.id === 'glass');

    expect(glass).toBeDefined();
    expect(glass.probability).toBeGreaterThan(30);
  });

  it('handles null/empty conditions gracefully', () => {
    const events = predictWindEvents('utah-lake-zigzag', null, null);
    expect(Array.isArray(events)).toBe(true);
  });

  it('handles empty stationHistory', () => {
    const events = predictWindEvents('utah-lake-zigzag', {}, {}, []);
    expect(Array.isArray(events)).toBe(true);
  });

  it('returns events sorted by probability descending', () => {
    const conditions = { windSpeed: 10, windDirection: 200, windGust: 14 };
    const pressure = { gradient: 0.5, trend: 'falling' };

    const events = predictWindEvents('utah-lake-zigzag', conditions, pressure);
    for (let i = 1; i < events.length; i++) {
      expect(events[i - 1].probability).toBeGreaterThanOrEqual(events[i].probability);
    }
  });

  it('each event has required shape fields', () => {
    const conditions = { windSpeed: 12, windDirection: 315, windGust: 18, temperature: 40 };
    const pressure = { gradient: 2.5, trend: 'falling' };

    const events = predictWindEvents('utah-lake-zigzag', conditions, pressure, []);
    for (const event of events) {
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('probability');
      expect(event).toHaveProperty('confidence');
      expect(event).toHaveProperty('timing');
      expect(event).toHaveProperty('details');
    }
  });
});
