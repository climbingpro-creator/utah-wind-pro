import { describe, expect, it } from 'vitest';
import { tremontonFluidNow } from '@utahwind/weather';
import {
  airshed,
  describeMeter,
  forecastHourCall,
  pickFieldMeter,
  readMeters,
  sprayWindow,
  sprinklerWindow,
  waterWindow,
  windTrend,
} from './farmDecisions';

const NOW = new Date('2026-11-02T22:00:00Z').getTime(); // 3:00 PM Denver

function meter(overrides = {}) {
  return {
    id: 'KBMC',
    name: 'Brigham City Regional Airport',
    lat: 41.5524,
    lng: -112.0622,
    source: 'nws',
    windSpeed: 6,
    windGust: 8,
    windDir: 210,
    temp: 62,
    obsTime: new Date(NOW - 10 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

describe('readMeters', () => {
  it('keeps a fresh Bear River meter and drops a model grid point', () => {
    const rows = readMeters([
      meter(),
      { id: 'OM_41.7_-112.1', source: 'open-meteo', lat: 41.7, lon: -112.1, windSpeed: 9, obsTime: new Date(NOW).toISOString() },
    ], NOW);
    expect(rows.map(r => r.id)).toEqual(['KBMC']);
    expect(rows[0].airshed).toBe('Bear River Valley');
    expect(rows[0].stale).toBe(false);
  });

  it('marks a 2-hour-old reading stale and leaves Cache Valley unused by the picker', () => {
    const rows = readMeters([
      meter({ obsTime: new Date(NOW - 120 * 60 * 1000).toISOString() }),
      meter({
        id: 'KLGU',
        name: 'Logan-Cache Airport',
        lat: 41.7912,
        lng: -111.8522,
        windSpeed: 12,
        obsTime: new Date(NOW).toISOString(),
      }),
    ], NOW);
    expect(rows.find(r => r.id === 'KBMC').stale).toBe(true);
    expect(airshed(41.7912, -111.8522)).toBe('Cache Valley');
    expect(pickFieldMeter(rows)).toBeNull();
  });

  it('picks the nearer Bear River meter over Logan', () => {
    const rows = readMeters([
      meter(),
      meter({
        id: 'KLGU',
        name: 'Logan-Cache Airport',
        lat: 41.7912,
        lng: -111.8522,
        windSpeed: 4,
      }),
    ], NOW);
    expect(pickFieldMeter(rows).id).toBe('KBMC');
    expect(describeMeter(pickFieldMeter(rows))).toContain('Brigham City airport');
    expect(describeMeter(pickFieldMeter(rows))).toContain('not the pivot');
  });

  it('treats an impossible wind as no reading', () => {
    const rows = readMeters([meter({ windSpeed: 240 })], NOW);
    expect(rows[0].speed).toBeNull();
    expect(pickFieldMeter(rows)).toBeNull();
    expect(sprinklerWindow(null).title).toBe('Data Unavailable');
  });
});

describe('windows', () => {
  const fresh = readMeters([meter()], NOW)[0];

  it('calls a light set caution when the gust is missing', () => {
    const calm = { ...fresh, speed: 3, gust: null };
    const call = sprinklerWindow(calm);
    expect(call.title).toBe('Pattern holds');
    expect(call.status).toBe('caution');
    expect(call.detail).toContain('Gust is not on this meter');
  });

  it('shuts wheel lines over 15 mph', () => {
    expect(sprinklerWindow({ ...fresh, speed: 18, gust: 22 }).title).toBe('Shut wheel lines');
  });

  it('holds water when rain is likely', () => {
    const call = waterWindow({
      meter: fresh,
      hours: [{ precipChance: 50, shortForecast: 'Chance Rain Showers' }],
    });
    expect(call.title).toBe('Let the rain fall first');
  });

  it('parks the sprayer in a morning inversion', () => {
    const call = sprayWindow({
      meter: { ...fresh, speed: 1, gust: 2 },
      hours: [],
      now: new Date('2026-11-02T13:30:00Z'),
    });
    expect(call.status).toBe('closed');
    expect(call.detail).toContain('inversion');
  });

  it('parks the sprayer when the gust is over 10', () => {
    const call = sprayWindow({
      meter: { ...fresh, speed: 6, gust: 14 },
      hours: [{ precipChance: 0, shortForecast: 'Sunny' }],
      now: new Date('2026-11-02T22:00:00Z'),
    });
    expect(call.status).toBe('closed');
    expect(call.detail).toContain('product label');
    expect(call.valley).toContain('Bear River valley pull');
  });

  it('opens spray only inside 3 to 10 with a known gust and dry hours', () => {
    const call = sprayWindow({
      meter: { ...fresh, speed: 6, gust: 8, tempF: 70 },
      hours: [{ precipChance: 10, shortForecast: 'Sunny' }],
      now: new Date('2026-11-02T22:00:00Z'),
    });
    expect(call.status).toBe('open');
    expect(call.title).toBe('Spray window is open');
  });

  it('calls a rise only when the earlier hours exist', () => {
    const flat = Array.from({ length: 12 }, () => ({ mph: 6 }));
    expect(windTrend(flat).title).toBe('Wind is holding');
    const rising = [...Array.from({ length: 6 }, () => ({ mph: 4 })), ...Array.from({ length: 6 }, () => ({ mph: 9 }))];
    expect(windTrend(rising).title).toBe('Wind is coming up');
    expect(windTrend([{ mph: 5 }, { mph: 6 }]).title).toBe('Data Unavailable');
  });

  it('carries a south wind from Brigham toward Tremonton and leaves a north wind alone', () => {
    const south = tremontonFluidNow({ KBMC: { speed: 10, direction: 210 } });
    expect(south.status).toBe('ready');
    expect(south.speed).toBeGreaterThan(7);
    expect(south.speed).toBeLessThan(10);
    expect(south.detail).toContain('not the pivot');

    const north = tremontonFluidNow({ KBMC: { speed: 10, direction: 350 } });
    expect(north.status).toBe('unavailable');
    expect(north.detail).toContain('Data Unavailable');
  });

  it('does not call an NWS hour gust-safe', () => {
    const call = forecastHourCall({
      startTime: '2026-11-02T22:00:00-07:00',
      windSpeed: 6,
      windDirection: 'SW',
      temperature: 60,
      precipChance: 0,
      shortForecast: 'Sunny',
    });
    expect(call.status).toBe('caution');
    expect(call.detail).toContain('not called gust-safe');
  });
});
