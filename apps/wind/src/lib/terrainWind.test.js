import { describe, expect, it } from 'vitest';
import {
  classifyTerrain,
  decodeTerrarium,
  deflectFlow,
  pathCrosses,
  steerByTerrain,
  terrainSentence,
} from './terrainWind';

describe('Terrarium elevation', () => {
  it('decodes a known height and rejects a broken pixel', () => {
    expect(decodeTerrarium(133, 0, 0)).toBe(1280);
    expect(decodeTerrarium(133, 0, 256)).toBeNull();
  });
});

describe('a path across real ground', () => {
  it('lets wind cross open ground', () => {
    const row = classifyTerrain(
      { lat: 41.7, lon: -112.2 },
      { lat: 41.7, lon: -112.0 },
      () => 1300,
    );
    expect(row.terrain).toBe('open');
    expect(pathCrosses(row)).toBe(true);
  });

  it('stops a path that climbs a ridge between the meters', () => {
    const row = classifyTerrain(
      { lat: 40.7, lon: -112.0 },
      { lat: 40.7, lon: -111.6 },
      (lat, lon) => (lon < -111.85 || lon > -111.75 ? 1400 : 3200),
    );
    expect(row.terrain).toBe('blocked');
    expect(row.ridgeFt).toBeGreaterThan(1400);
    expect(pathCrosses(row)).toBe(false);
    const sentence = terrainSentence({
      speed: 24,
      from: 'Valley',
      to: 'Far side',
      miles: 16,
      minutes: 40,
      ...row,
    });
    expect(sentence).toContain('does not cross');
    expect(sentence).not.toContain('minutes out');
  });

  it('calls a climb onto the downstream meter a lift, not a wall', () => {
    const row = classifyTerrain(
      { lat: 41.7, lon: -112.2 },
      { lat: 41.55, lon: -111.95 },
      (lat) => (lat > 41.65 ? 1400 : 1800),
    );
    expect(row.terrain).toBe('lift');
    expect(row.climbFt).toBeGreaterThan(400);
  });

  it('stays Data Unavailable when a sample is missing', () => {
    const row = classifyTerrain(
      { lat: 41.7, lon: -112.2 },
      { lat: 41.7, lon: -112.0 },
      (lat, lon) => (lon < -112.1 ? 1300 : null),
    );
    expect(row.terrain).toBe('unavailable');
    expect(terrainSentence({
      speed: 12,
      from: 'A',
      to: 'B',
      miles: 10,
      minutes: 50,
      ...row,
    })).toContain('Data Unavailable');
  });
});

describe('the flow around a hill', () => {
  it('leaves a flat field and a missing sample alone', () => {
    const flat = deflectFlow(10, 0, {
      here: 1300, east: 1300, west: 1300, north: 1300, south: 1300, upwind: 1300, downwind: 1300, stepM: 800,
    }, 11);
    expect(flat.steered).toBe(false);
    expect(flat.u).toBe(10);
    const missing = deflectFlow(10, 4, {
      here: null, east: 1500, west: 1400, north: 1400, south: 1400, upwind: 1800, downwind: 1200, stepM: 800,
    }, 11);
    expect(missing.u).toBe(10);
    expect(missing.v).toBe(4);
  });

  it('does not bend the statewide view', () => {
    const row = deflectFlow(10, 0, {
      here: 1400, east: 2000, west: 1000, north: 1400, south: 1400, upwind: 1000, downwind: 2000, stepM: 1600,
    }, 6.5);
    expect(row.u).toBe(10);
    expect(row.v).toBe(0);
    expect(row.steered).toBe(false);
  });

  it('turns a climb aside and does not speed the wind up', () => {
    const into = deflectFlow(8, 6, {
      here: 1400, east: 1750, west: 1200, north: 1400, south: 1400, upwind: 1200, downwind: 1750, stepM: 800,
    }, 11);
    expect(into.steered).toBe(true);
    expect(into.u).toBeLessThan(8);
    expect(Math.hypot(into.u, into.v)).toBeLessThanOrEqual(10 + 1e-6);
  });

  it('curls back in the lee of a peak and does not invent speed', () => {
    const row = deflectFlow(0, 10, {
      here: 1400,
      east: 1400,
      west: 1400,
      north: 1280,
      south: 1680,
      upwind: 1900,
      downwind: 1250,
      stepM: 800,
    }, 11);
    expect(row.v).toBeLessThan(0);
    expect(Math.hypot(row.u, row.v)).toBeLessThanOrEqual(10 + 1e-6);
    expect(Math.hypot(row.u, row.v)).toBeGreaterThan(0.5);
  });
});

describe('the flow layer on a grade', () => {
  it('turns aside the uphill part and does not speed the wind up', () => {
    const flat = steerByTerrain(10, 0, 1300, 1300, 1300, 1000, 1000);
    expect(flat.steered).toBe(false);
    expect(flat.u).toBe(10);
    const uphill = steerByTerrain(10, 0, 1300, 1500, 1300, 1000, 1000);
    expect(uphill.steered).toBe(true);
    expect(uphill.u).toBeLessThan(10);
    expect(Math.hypot(uphill.u, uphill.v)).toBeLessThan(10);
    const down = steerByTerrain(-10, 0, 1300, 1500, 1300, 1000, 1000);
    expect(down.steered).toBe(false);
    expect(down.u).toBe(-10);
    const missing = steerByTerrain(10, 0, null, 1500, 1300, 1000, 1000);
    expect(missing.u).toBe(10);
  });
});
