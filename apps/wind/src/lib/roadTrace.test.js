import { describe, expect, it } from 'vitest';
import { sliceRoutePath, traceRoadLines } from './roadTrace';

const VALLEY = [
  [-113.20, 37.50, 40],
  [-113.20, 37.55, 44],
  [-113.15, 37.60, 48],
  [-113.08, 37.68, 55],
];

describe('centerline between two mileposts', () => {
  it('follows the bend instead of cutting across it', () => {
    const coords = sliceRoutePath(VALLEY, 40, 55);
    expect(coords[0][0]).toBeCloseTo(-113.20, 2);
    expect(coords[coords.length - 1][1]).toBeCloseTo(37.68, 2);
    expect(coords).toContainEqual([-113.20, 37.55]);
    expect(coords).toContainEqual([-113.15, 37.60]);
  });

  it('does not fill a gap longer than the road between two meters', () => {
    expect(sliceRoutePath(VALLEY, 40, 90)).toBeNull();
    expect(sliceRoutePath(VALLEY, 40, 40.1)).toBeNull();
  });
});

describe('tying a meter pair to the highway', () => {
  const highways = { 'I-15': [VALLEY] };

  it('draws the valley line for the two meters that sit on it', () => {
    const traced = traceRoadLines([{
      id: 'I-15:a:b',
      route: 'I-15',
      from: 'I-15 @ MP 40',
      to: 'I-15 @ MP 55',
      lat1: 37.50,
      lon1: -113.20,
      lat2: 37.68,
      lon2: -113.08,
      kind: 'dry',
    }], highways);
    expect(traced).toHaveLength(1);
    expect(traced[0].coordinates.length).toBeGreaterThan(2);
    expect(traced[0].kind).toBe('dry');
  });

  it('drops a meter whose milepost is not where the truck is', () => {
    const traced = traceRoadLines([{
      id: 'I-15:a:b',
      route: 'I-15',
      from: 'I-15 @ MP 40',
      to: 'I-15 @ MP 55',
      lat1: 38.50,
      lon1: -112.00,
      lat2: 37.68,
      lon2: -113.08,
      kind: 'snow',
    }], highways);
    expect(traced).toEqual([]);
  });

  it('does not bridge two pieces of a route across a missing gap', () => {
    const gapped = {
      'US-89': [
        [[-111.5, 40.0, 10], [-111.5, 40.2, 20]],
        [[-111.5, 41.0, 80], [-111.5, 41.2, 90]],
      ],
    };
    const traced = traceRoadLines([{
      id: 'US-89:a:b',
      route: 'US-89',
      from: 'US-89 @ MP 15',
      to: 'US-89 @ MP 85',
      lat1: 40.1,
      lon1: -111.5,
      lat2: 41.1,
      lon2: -111.5,
      kind: 'wet',
    }], gapped);
    expect(traced).toEqual([]);
  });
});
