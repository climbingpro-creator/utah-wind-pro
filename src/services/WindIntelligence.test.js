import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/FrontalTrendPredictor', () => ({ monitorSwings: vi.fn(() => []) }));
vi.mock('../services/WindEventPredictor', () => ({ predictWindEvents: vi.fn(() => []) }));

import { synthesize, isRegimeSuitable } from './WindIntelligence.js';

function baseParams(overrides = {}) {
  return {
    lakeState: {},
    correlation: {},
    boatingPrediction: {},
    swingAlerts: [],
    mesoData: {},
    lakeId: 'utah-lake',
    ...overrides,
  };
}

describe('WindIntelligence.synthesize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not crash on empty / null-like inputs', () => {
    expect(() => synthesize({})).not.toThrow();
    const r = synthesize({});
    expect(r).toMatchObject({
      signals: expect.any(Array),
      conflicts: expect.any(Array),
      regime: expect.any(String),
      narrative: expect.any(String),
    });

    expect(() =>
      synthesize(
        baseParams({
          lakeState: null,
          correlation: undefined,
          boatingPrediction: null,
        }),
      ),
    ).not.toThrow();
  });

  it('detects thermal regime when thermal prob is high, no frontal, no north flow', () => {
    const r = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 72 },
          pressure: { gradient: 0.2 },
        },
      }),
    );
    expect(r.regime).toBe('thermal');
    expect(r.regimeConfidence).toBe(72);
  });

  it("detects north_flow when pressure gradient > 1.5 and thermal is not high", () => {
    const r = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 40 },
          pressure: { gradient: 2.1 },
        },
      }),
    );
    expect(r.regime).toBe('north_flow');
  });

  it('detects frontal conflict: high thermal + frontal alert caps adjusted probability at <= 20', () => {
    const r = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 75 },
          pressure: { gradient: 0 },
        },
        swingAlerts: [
          { id: 'frontal-hit', severity: 'critical', label: 'Cold front', detail: 'approaching' },
        ],
      }),
    );
    expect(r.conflicts.some((c) => c.id === 'thermal-vs-frontal')).toBe(true);
    expect(r.adjustedThermalProbability).toBeLessThanOrEqual(20);
    expect(r.regime).toBe('frontal');
  });

  it("detects glass regime when wind is light and thermal probability is low", () => {
    const r = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 15 },
          wind: { stations: [{ windSpeed: 2 }] },
        },
      }),
    );
    expect(r.regime).toBe('glass');
  });

  it('gives high convergence when signals agree (all bullish side), low when mixed', () => {
    const aligned = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 70 },
        },
      }),
    );
    expect(aligned.convergenceScore).toBe(100);

    const mixed = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 70 },
          pressure: { gradient: 2 },
        },
        swingAlerts: [{ id: 'frontal-hit', severity: 'high', label: 'Front' }],
      }),
    );
    expect(mixed.convergenceScore).toBeLessThan(aligned.convergenceScore);
  });

  it('builds narratives appropriate to each regime', () => {
    const north = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 30 },
          pressure: { gradient: 2 },
        },
      }),
    );
    expect(north.narrative).toMatch(/North flow regime/i);

    const frontal = synthesize(
      baseParams({
        lakeState: { thermalPrediction: { probability: 70 } },
        swingAlerts: [{ id: 'wind-shift', severity: 'critical', label: 'Shift' }],
      }),
    );
    expect(frontal.narrative).toMatch(/frontal passage/i);

    const thermal = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 65, startHour: 14 },
          pressure: { gradient: 0 },
        },
      }),
    );
    expect(thermal.narrative).toMatch(/Thermal cycle active/i);
    expect(thermal.narrative).toMatch(/Peak window/i);

    const glass = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 10 },
          wind: { stations: [{ windSpeed: 1 }] },
        },
      }),
    );
    expect(glass.narrative).toMatch(/Glass\/calm/i);

    const building = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 45 },
          pressure: { gradient: 0 },
        },
      }),
    );
    expect(building.narrative).toMatch(/Conditions building/i);

    const transitional = synthesize(
      baseParams({
        lakeState: {
          thermalPrediction: { probability: 5 },
        },
      }),
    );
    expect(transitional.narrative).toMatch(/Transitional weather pattern/i);
  });
});

describe('isRegimeSuitable', () => {
  it('allows wind sports for thermal, north_flow, frontal, building', () => {
    expect(isRegimeSuitable('thermal', 'kiting')).toBe(true);
    expect(isRegimeSuitable('north_flow', 'paragliding')).toBe(true);
    expect(isRegimeSuitable('frontal', 'windsurfing')).toBe(true);
    expect(isRegimeSuitable('building', 'sailing')).toBe(true);
  });

  it('rejects glass/transitional for wind sports', () => {
    expect(isRegimeSuitable('glass', 'kiting')).toBe(false);
    expect(isRegimeSuitable('transitional', 'paragliding')).toBe(false);
  });

  it('prefers glass or transitional for calm activities', () => {
    expect(isRegimeSuitable('glass', 'boating')).toBe(true);
    expect(isRegimeSuitable('transitional', 'fishing')).toBe(true);
    expect(isRegimeSuitable('thermal', 'boating')).toBe(false);
  });

  it('returns true for unknown activities', () => {
    expect(isRegimeSuitable('thermal', 'unknown-activity')).toBe(true);
  });
});
