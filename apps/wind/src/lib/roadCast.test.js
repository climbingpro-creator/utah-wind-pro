import { describe, expect, it } from 'vitest';
import {
  pickSegmentMeter,
  plowCall,
  roadSegment,
  segmentHistoryNote,
  segmentWind,
  splitWhy,
} from './roadCast';

const valleyGrid = { snowNext6: 0, rainNext6: 0.02, tempMinNext6: 40 };
const passGrid = { snowNext6: 0.4, rainNext6: 0.05, tempMinNext6: 30 };

describe('road segments', () => {
  it('keeps Sardine on the pass even when the coordinate sits on the Cache side of the line', () => {
    expect(roadSegment({
      name: 'US-89 @ Sardine',
      id: 'UDOT-SARDINE',
      airshed: 'Cache Valley',
    })).toBe('pass');
  });

  it('leaves Logan unused', () => {
    expect(roadSegment({ name: 'Logan', airshed: 'Cache Valley' })).toBe('cache');
  });

  it('prefers a UDOT meter on the valley lanes over a closer farm meter', () => {
    const chosen = pickSegmentMeter([
      { name: 'Bothwell', source: 'nws', airshed: 'Bear River Valley', stale: false, speed: 2, tempF: 40 },
      { name: 'I-15 @ Tremonton', source: 'udot', airshed: 'Bear River Valley', stale: false, speed: 11, tempF: 39 },
    ], 'valley');
    expect(chosen.name).toBe('I-15 @ Tremonton');
  });

  it('skips a stale valley meter', () => {
    const chosen = pickSegmentMeter([
      { name: 'I-15 @ Tremonton', airshed: 'Bear River Valley', stale: true, speed: 11, tempF: 40 },
      { name: 'I-15 @ Plymouth', airshed: 'Bear River Valley', stale: false, speed: 5, tempF: 38 },
    ], 'valley');
    expect(chosen.name).toBe('I-15 @ Plymouth');
  });
});

describe('plow calls', () => {
  it('dispatches the pass and not the valley when only the pass is snowing and cold', () => {
    const pass = plowCall({
      place: 'Sardine Summit',
      snowIn6: passGrid.snowNext6,
      rainIn6: passGrid.rainNext6,
      tempMin6: passGrid.tempMinNext6,
      meterTemp: 31,
      meterName: 'Sardine Summit',
    });
    const valley = plowCall({
      place: 'Valley lanes',
      snowIn6: valleyGrid.snowNext6,
      rainIn6: valleyGrid.rainNext6,
      tempMin6: valleyGrid.tempMinNext6,
      meterTemp: 41,
      meterName: 'I-15 @ Tremonton',
    });
    expect(pass.title).toBe('Dispatch plows now');
    expect(pass.detail).toContain('not a road closure');
    expect(valley.title).toBe('No plow on this segment');
  });

  it('does not dispatch snow that is above freezing', () => {
    const call = plowCall({
      place: 'Sardine Summit',
      snowIn6: 0.3,
      rainIn6: 0,
      tempMin6: 38,
      meterTemp: 40,
      meterName: 'Sardine',
    });
    expect(call.title).toBe('Snow in the grid, air is above freezing');
  });

  it('stays Data Unavailable when the snow grid is blank', () => {
    const call = plowCall({ place: 'Valley lanes', snowIn6: null, rainIn6: null, tempMin6: 20 });
    expect(call.title).toBe('Data Unavailable');
  });
});

describe('why the segments differ', () => {
  it('names the wind path and still calls the inches a forecast grid', () => {
    const why = splitWhy({
      valley: valleyGrid,
      pass: passGrid,
      fluid: { status: 'ready', speed: 8.9 },
    });
    expect(why.title).toBe('Snow on the pass, not the valley lanes');
    expect(why.detail).toContain('8.9');
    expect(why.detail).toContain('forecast grid');
    expect(why.detail).toContain('does not make the snow');
  });

  it('does not invent a wind carry when the path is unavailable', () => {
    const why = splitWhy({
      valley: valleyGrid,
      pass: passGrid,
      fluid: { status: 'unavailable' },
    });
    expect(why.detail).toContain('Data Unavailable');
    expect(why.detail).not.toContain('mph from');
  });
});

describe('meters and history', () => {
  it('does not copy a missing segment wind', () => {
    expect(segmentWind(null)).toContain('Data Unavailable');
  });

  it('does not pretend a UDOT meter has an archive', () => {
    const note = segmentHistoryNote(
      { name: 'I-15 @ Tremonton', source: 'udot' },
      { points: [] },
    );
    expect(note).toContain('Data Unavailable');
    expect(note).toContain('not in the National Weather Service archive');
  });

  it('reports a falling temperature only from stored hours', () => {
    const points = [40, 40, 39, 34, 33, 32].map(tempF => ({ tempF }));
    const note = segmentHistoryNote(
      { name: 'Sardine Summit', source: 'nws' },
      { points },
    );
    expect(note).toContain('falling');
  });
});
