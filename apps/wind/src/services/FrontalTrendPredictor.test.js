import { describe, it, expect } from 'vitest';
import { monitorSwings, isFrontalPassage } from './FrontalTrendPredictor';

/** Build ISO timestamps: oldest → newest, last = now */
function series(minuteOffsets, fill) {
  const end = Date.UTC(2025, 5, 1, 18, 0, 0);
  return minuteOffsets.map((off) => {
    const ts = new Date(end + off * 60 * 1000).toISOString();
    return { timestamp: ts, ...fill(off) };
  });
}

describe('FrontalTrendPredictor monitorSwings', () => {
  it('returns [] for null history', () => {
    expect(monitorSwings(null)).toEqual([]);
  });

  it('returns [] for undefined history', () => {
    expect(monitorSwings(undefined)).toEqual([]);
  });

  it('returns [] for empty history', () => {
    expect(monitorSwings([])).toEqual([]);
  });

  it('returns [] when history has fewer than 4 points', () => {
    const h = series([-120, -60, 0], () => ({
      temperature: 70,
      windSpeed: 5,
      windDirection: 180,
      windGust: 5,
    }));
    expect(h).toHaveLength(3);
    expect(monitorSwings(h)).toEqual([]);
  });

  it('emits frontal-hit when 3h temperature drop meets registry threshold (10°F)', () => {
    const h = series([-180, -120, -60, 0], (off) => {
      if (off === -180) {
        return { temperature: 75, windSpeed: 5, windDirection: 270, windGust: 5 };
      }
      return { temperature: 72, windSpeed: 5, windDirection: 270, windGust: 5 };
    });
    h[h.length - 1] = {
      ...h[h.length - 1],
      temperature: 64,
    };
    const alerts = monitorSwings(h);
    const hit = alerts.find((a) => a.id === 'frontal-hit');
    expect(hit).toBeDefined();
    expect(hit.severity).toBe('critical');
    expect(hit.label).toBe('Frontal Boundary Hit');
  });

  it('emits rapid-cool when 1h temperature drop meets threshold without necessarily 3h frontal', () => {
    const h = series([-180, -120, -60, 0], (off) => {
      if (off === -180) return { temperature: 66, windSpeed: 5, windDirection: 270, windGust: 5 };
      if (off === -60) return { temperature: 71, windSpeed: 5, windDirection: 270, windGust: 5 };
      return { temperature: 68, windSpeed: 5, windDirection: 270, windGust: 5 };
    });
    h[h.length - 1] = { ...h[h.length - 1], temperature: 64 };
    const alerts = monitorSwings(h);
    const rapid = alerts.find((a) => a.id === 'rapid-cool');
    expect(rapid).toBeDefined();
    expect(rapid.id).toBe('rapid-cool');
    expect(rapid.severity).toBe('warning');
  });

  it('emits wind-shift when direction changes ≥90° within ~1h', () => {
    const h = series([-180, -120, -60, 0], (off) => {
      const dir = off <= -60 ? 10 : 110;
      return { temperature: 70, windSpeed: 12, windDirection: dir, windGust: 12 };
    });
    const alerts = monitorSwings(h);
    const shift = alerts.find((a) => a.id === 'wind-shift');
    expect(shift).toBeDefined();
    expect(shift.detail).toMatch(/→/);
  });

  it('emits gust-spike when gust exceeds sustained by threshold (15 mph)', () => {
    const h = series([-180, -120, -60, 0], () => ({
      temperature: 70,
      windSpeed: 10,
      windDirection: 270,
      windGust: 10,
    }));
    h[h.length - 1] = {
      ...h[h.length - 1],
      windSpeed: 10,
      windGust: 28,
    };
    const alerts = monitorSwings(h);
    const gust = alerts.find((a) => a.id === 'gust-spike');
    expect(gust).toBeDefined();
    expect(gust.value).toBeGreaterThanOrEqual(15);
  });

  it('emits pressure-bomb when pressure rises enough across history', () => {
    const h = series([-180, -120, -60, 0], () => ({
      temperature: 70,
      windSpeed: 8,
      windDirection: 270,
      windGust: 8,
    }));
    const pressureHistory = {
      values: [29.9, 29.95],
      timestamps: ['a', 'b'],
    };
    const alerts = monitorSwings(h, pressureHistory);
    const bomb = alerts.find((a) => a.id === 'pressure-bomb');
    expect(bomb).toBeDefined();
    expect(bomb.id).toBe('pressure-bomb');
  });

  it('emits pressure-drop when pressure falls by threshold', () => {
    const h = series([-180, -120, -60, 0], () => ({
      temperature: 70,
      windSpeed: 8,
      windDirection: 270,
      windGust: 8,
    }));
    const pressureHistory = {
      values: [30.0, 29.95],
      timestamps: ['a', 'b'],
    };
    const alerts = monitorSwings(h, pressureHistory);
    const drop = alerts.find((a) => a.id === 'pressure-drop');
    expect(drop).toBeDefined();
  });

  it('sorts alerts with critical before warning before info', () => {
    const h = series([-180, -120, -60, 0], (off) => {
      if (off === -180) {
        return { temperature: 80, windSpeed: 5, windDirection: 0, windGust: 5 };
      }
      if (off === -60) return { temperature: 75, windSpeed: 5, windDirection: 0, windGust: 5 };
      return { temperature: 72, windSpeed: 5, windDirection: 0, windGust: 5 };
    });
    h[h.length - 1] = {
      ...h[h.length - 1],
      temperature: 65,
      windDirection: 120,
      windGust: 35,
      windSpeed: 10,
    };
    const alerts = monitorSwings(h);
    const severities = alerts.map((a) => a.severity);
    const rank = { critical: 0, warning: 1, info: 2 };
    for (let i = 1; i < severities.length; i++) {
      expect(rank[severities[i - 1]]).toBeLessThanOrEqual(rank[severities[i]]);
    }
  });
});

describe('FrontalTrendPredictor isFrontalPassage', () => {
  it('returns false when no frontal-hit or wind-shift', () => {
    const h = series([-180, -120, -60, 0], () => ({
      temperature: 70,
      windSpeed: 8,
      windDirection: 270,
      windGust: 8,
    }));
    expect(isFrontalPassage(h)).toBe(false);
  });

  it('returns true when frontal-hit is present', () => {
    const h = series([-180, -120, -60, 0], (off) =>
      off === -180
        ? { temperature: 75, windSpeed: 5, windDirection: 270, windGust: 5 }
        : { temperature: 72, windSpeed: 5, windDirection: 270, windGust: 5 }
    );
    h[h.length - 1] = { ...h[h.length - 1], temperature: 63 };
    expect(isFrontalPassage(h)).toBe(true);
  });

  it('returns true when wind-shift is present without 3h temp drop', () => {
    const h = series([-180, -120, -60, 0], (off) => ({
      temperature: 68,
      windSpeed: 10,
      windDirection: off <= -60 ? 5 : 100,
      windGust: 10,
    }));
    expect(isFrontalPassage(h)).toBe(true);
  });

  it('returns false for short history', () => {
    expect(isFrontalPassage([])).toBe(false);
  });
});
