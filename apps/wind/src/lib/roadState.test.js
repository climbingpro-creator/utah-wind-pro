import { describe, expect, it } from 'vitest';
import {
  carrySentence,
  normalizeStation,
  pavementNow,
  roadHeadline,
  roadHazardSentence,
  roadLines,
  routeOf,
  statewidePlow,
  summarizePassGrid,
  visibilityCall,
  windCarries,
  windWarning,
} from './roadState';

const NOW = Date.parse('2026-11-04T23:16:00Z');

function meter(overrides) {
  return {
    id: 'a',
    name: 'I-15 @ Tremonton',
    lat: 41.71,
    lon: -112.17,
    airF: 50,
    pavementF: 52,
    surface: 'Dry',
    precip: null,
    speed: 8,
    gust: 12,
    dir: 90,
    stale: false,
    ...overrides,
  };
}

describe('UDOT station readings', () => {
  it('drops an impossible wind and a blank precip flag', () => {
    const row = normalizeStation({
      Id: '1',
      StationName: 'I-15 @ Tremonton',
      Latitude: 41.71,
      Longitude: -112.17,
      WindSpeedAvg: 140,
      WindSpeedGust: 9,
      WindDirection: 'E',
      Precipitation: 'NAN',
      SurfaceStatus: 'Dry',
      SurfaceTemp: 57.6,
      AirTemperature: 54,
      LastUpdated: NOW / 1000,
    }, NOW);
    expect(row.speed).toBeNull();
    expect(row.gust).toBe(9);
    expect(row.dir).toBe(90);
    expect(row.precip).toBeNull();
    expect(row.pavementF).toBe(57.6);
    expect(row.stale).toBe(false);
  });

  it('marks a reading older than 90 minutes stale', () => {
    const row = normalizeStation({
      Id: '1',
      StationName: 'SR-30',
      Latitude: 41.8,
      Longitude: -112.2,
      LastUpdated: (NOW / 1000) - (91 * 60),
    }, NOW);
    expect(row.stale).toBe(true);
  });
});

describe('fluid path from the road meters', () => {
  it('carries an east wind to the next meter down the road', () => {
    const carries = windCarries([
      meter({ id: 'up', speed: 12, dir: 90, lon: -112.2 }),
      meter({ id: 'down', name: 'I-84 @ Whites Valley', lat: 41.71, lon: -112.0, speed: 3, dir: 180 }),
      meter({ id: 'north', name: 'I-15 @ Plymouth', lat: 41.95, lon: -112.2, speed: 4, dir: 0 }),
    ]);
    expect(carries).toHaveLength(1);
    expect(carries[0].to).toBe('I-84 @ Whites Valley');
    expect(carries[0].speed).toBe(12);
    expect(carries[0].minutes).toBeGreaterThan(0);
  });

  it('does not aim a north wind at a meter to the east', () => {
    const carries = windCarries([
      meter({ id: 'up', dir: 0, lon: -112.2 }),
      meter({ id: 'east', name: 'East station', lat: 41.71, lon: -112.0 }),
    ]);
    expect(carries).toEqual([]);
    expect(carrySentence(carries)).toContain('Data Unavailable');
    expect(carrySentence(carries)).not.toMatch(/\d mph/);
  });
});

describe('highlighted roads', () => {
  it('reads the route number the centerline file uses', () => {
    expect(routeOf('I-15 @ MP 350')).toBe('I-15');
    expect(routeOf('US-89A @ MP 4')).toBe('US-89A');
    expect(routeOf('Bothwell')).toBeNull();
  });

  it('joins the meters on one highway and keeps the worse pavement', () => {
    const lines = roadLines([
      meter({ id: 'n', name: 'I-15 @ MP 350', lat: 41.7, lon: -112.1, surface: 'Dry' }),
      meter({ id: 's', name: 'I-15 @ MP 360', lat: 41.8, lon: -112.1, surface: 'Snow' }),
      meter({ id: 'gap', name: 'I-15 @ MP 500', lat: 39.2, lon: -112.1, surface: 'Wet' }),
      meter({ id: 'plain', name: 'Bothwell', lat: 41.75, lon: -112.2, surface: 'Ice' }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].route).toBe('I-15');
    expect(lines[0].kind).toBe('snow');
    expect(roadHazardSentence(lines[0])).toContain('Snow on the pavement');
    expect(roadHazardSentence(lines[0])).toContain('not a road closure');
    expect(roadHazardSentence(lines[0]).toLowerCase()).not.toContain('close the road');
  });

  it('does not paint a road from a stale meter', () => {
    const lines = roadLines([
      meter({ id: 'a', name: 'US-89 @ MP 10', lat: 41.5, lon: -111.95, stale: true, surface: 'Snow' }),
      meter({ id: 'b', name: 'US-89 @ MP 12', lat: 41.55, lon: -111.95, surface: 'Dry' }),
    ]);
    expect(lines).toEqual([]);
  });
});

describe('the one-screen call', () => {
  it('puts snow on the pavement ahead of a quiet forecast', () => {
    const surface = pavementNow([meter({ surface: 'Snow' })]);
    const headline = roadHeadline({
      surface,
      plow: { status: 'open', title: 'No plow', detail: 'No snow.' },
      wind: { status: 'open', title: 'No high wind', detail: 'Quiet.' },
      vis: { status: 'open', title: 'Visibility is open', detail: '10 miles.' },
      carries: [],
    });
    expect(headline.title).toBe('Snow or ice on the pavement');
    expect(headline.detail).toContain('not a road closure');
    expect(headline.detail.toLowerCase()).not.toContain('close the road');
  });

  it('dispatches plows only where the pass grid is snowing and the pavement is cold', () => {
    const call = statewidePlow([
      { name: 'Sardine Summit', lat: 41.55, lng: -111.95, snowNext6: 0.4, rainNext6: 0, tempMinNext6: 30 },
      { name: 'Parleys Summit', lat: 40.75, lng: -111.62, snowNext6: 0, rainNext6: 0, tempMinNext6: 40 },
    ], [
      meter({ name: 'US-89 @ Sardine', lat: 41.55, lon: -111.95, pavementF: 31, surface: 'Dry' }),
    ]);
    expect(call.title).toBe('Dispatch plows now');
    expect(call.detail).toContain('Sardine Summit');
    expect(call.detail).toContain('not a road closure');
  });

  it('does not dispatch when the grids are dry', () => {
    const call = statewidePlow([
      { name: 'Sardine Summit', lat: 41.55, lng: -111.95, snowNext6: 0, rainNext6: 0, tempMinNext6: 44 },
    ], []);
    expect(call.title).toBe('No plow');
  });

  it('warns on a road-meter gust and refuses a blank wind field', () => {
    expect(windWarning([meter({ gust: 46 })]).title).toBe('High wind');
    expect(windWarning([meter({ stale: true, gust: 50 })], []).status).toBe('unavailable');
  });

  it('uses an airport meter for visibility and labels a grid drop as a grid', () => {
    const low = visibilityCall({ meters: [{ name: 'Ogden airport', miles: 0.4, stale: false }] });
    expect(low.title).toBe('Low visibility');
    expect(low.detail).toContain('Airport meter');
    const grid = visibilityCall({
      meters: [],
      grids: [{ name: 'Parleys Summit', visMinMilesNext6: 0.5 }],
    });
    expect(grid.detail).toContain('Forecast grid');
  });

  it('reads the next six hours of a pass grid without inventing a missing hour', () => {
    const grid = summarizePassGrid(
      { id: 'sardine', name: 'Sardine Summit', lat: 41.55, lng: -111.95 },
      { hourly: { snowfall: [0.1, null, 0.2], precipitation: [0], temperature_2m: [30, 28], wind_gusts_10m: [10, 42], visibility: [1609, null] } },
    );
    expect(grid.snowNext6).toBeCloseTo(0.3);
    expect(grid.tempMinNext6).toBe(28);
    expect(grid.gustMaxNext6).toBe(42);
    expect(grid.visMinMilesNext6).toBeCloseTo(1, 1);
  });
});
