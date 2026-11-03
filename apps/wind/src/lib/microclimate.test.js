import { describe, expect, it } from 'vitest';
import { freezeCall, humidityCall, rainCall, snowByTerrain, uvCall, waterDemand } from './microclimate';

const valley = { name: 'Tremonton valley floor', elevFt: 4327, snowIn24: 0, rainIn24: 0.024, etIn24: 0.064, tempMin24: 39.8, uvMax24: 2.55, humidityNow: 75 };
const ridge = { name: 'Wellsville west face', elevFt: 7356, snowIn24: 0.276, tempMin24: 31.9 };

describe('microclimate', () => {
  it('keeps snow on the west face and off the valley floor', () => {
    const call = snowByTerrain({ valley, ridge });
    expect(call.title).toBe('Snow on the high ground, not the valley floor');
    expect(call.detail).toContain('0.28');
    expect(call.detail).toContain('7356');
    expect(call.detail).toContain('0.00');
  });

  it('warns for a freeze on the high ground when the valley stays above 32', () => {
    const call = freezeCall({ meterTemp: 42, meterName: 'I-15 @ Tremonton', valley, ridge });
    expect(call.status).toBe('caution');
    expect(call.title).toBe('Freeze on the high ground');
    expect(call.detail).toContain('32');
  });

  it('calls a valley freeze when the meter is at or below 32', () => {
    const call = freezeCall({ meterTemp: 30, meterName: 'I-15 @ Tremonton', valley, ridge });
    expect(call.status).toBe('closed');
    expect(call.title).toBe('Freeze warning');
  });

  it('states weather water demand without a pivot schedule', () => {
    const call = waterDemand({ etInches: valley.etIn24, rainInches: valley.rainIn24 });
    expect(call.title).toContain('0.04');
    expect(call.detail).toContain('not how long to run the pivot');
    expect(call.detail).toContain('No soil probe');
  });

  it('reads a low UV peak and meter humidity', () => {
    expect(uvCall(2.55).title).toBe('UV Low');
    expect(uvCall(null).title).toBe('Data Unavailable');
    const humid = humidityCall({ meterRh: 68, meterName: 'Bothwell', forecastRh: 75 });
    expect(humid.title).toBe('68% on the meter');
    expect(humid.detail).toContain('not soil moisture');
  });

  it('does not invent rain', () => {
    expect(rainCall(null).title).toBe('Data Unavailable');
    expect(rainCall(0).title).toContain('No meaningful rain');
    expect(snowByTerrain({ valley: null, ridge: null }).title).toBe('Data Unavailable');
    expect(waterDemand({ etInches: null, rainInches: 0.1 }).title).toBe('Data Unavailable');
    expect(freezeCall({ meterTemp: null, valley: null, ridge: null }).title).toBe('Data Unavailable');
  });
});