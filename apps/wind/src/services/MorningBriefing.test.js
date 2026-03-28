import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateBriefing } from './MorningBriefing';

describe('MorningBriefing generateBriefing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not crash when params is null', () => {
    const b = generateBriefing('kiting', null);
    expect(b).toMatchObject({
      headline: expect.any(String),
      body: expect.any(String),
      bullets: expect.any(Array),
      bestAction: expect.any(String),
      excitement: expect.any(Number),
    });
  });

  it('does not crash when activity is null with empty params', () => {
    const b = generateBriefing(null, {});
    expect(b.headline).toBeTruthy();
    expect(Array.isArray(b.bullets)).toBe(true);
  });

  it('kiting: returns structured briefing with wind-focused content when data present', () => {
    const b = generateBriefing('kiting', {
      currentWind: { speed: 18, gust: 22, direction: 'SW' },
      thermalPrediction: {
        probability: 0.75,
        startHour: 13,
        peakHour: 15,
        endHour: 18,
      },
      smartForecast: { translation: 'Thermals likely along the spine.' },
    });
    expect(b.headline.toLowerCase()).toContain('kiting');
    expect(b.body.length).toBeGreaterThan(10);
    expect(b.bullets.length).toBeGreaterThan(0);
    expect(b.bestAction).toBeTruthy();
    expect(b.excitement).toBeGreaterThanOrEqual(1);
    expect(b.excitement).toBeLessThanOrEqual(5);
    expect(b.timeOfDay).toBe('morning');
  });

  it('boating: uses calm-activity path with glass-friendly messaging', () => {
    const b = generateBriefing('boating', {
      currentWind: { speed: 2, gust: 2, direction: 'N' },
      smartForecast: {
        windows: [{ type: 'glass', label: 'morning' }],
      },
      boatingPrediction: { glassUntil: 11 },
      thermalPrediction: { probability: 0.2, startHour: 14 },
    });
    expect(b.headline.toLowerCase()).toMatch(/boating|glass|good/);
    expect(b.body.toLowerCase()).toMatch(/glass|mph/);
    expect(b.bullets.some((x) => x.text)).toBe(true);
    expect(b.bestAction).toBeTruthy();
  });

  it('every briefing has headline, body, bullets, bestAction, excitement', () => {
    const variants = [
      generateBriefing('kiting', {
        currentWind: { speed: 15, direction: 'W' },
        upstream: { kslcSpeed: 12, kslcDirection: 'NW' },
      }),
      generateBriefing('boating', {
        currentWind: { speed: 4, direction: 'S' },
        thermalPrediction: { probability: 0.4, startHour: 15 },
      }),
      generateBriefing('fishing', {
        currentWind: { speed: 6, direction: 'E' },
        fishingPrediction: { pressureTrend: 'rising', goldenHour: '6–7 AM' },
      }),
    ];
    for (const b of variants) {
      expect(typeof b.headline).toBe('string');
      expect(b.headline.length).toBeGreaterThan(0);
      expect(typeof b.body).toBe('string');
      expect(Array.isArray(b.bullets)).toBe(true);
      expect(typeof b.bestAction).toBe('string');
      expect(b.bestAction.length).toBeGreaterThan(0);
      expect(Number.isInteger(b.excitement)).toBe(true);
      expect(b.timeOfDay).toMatch(/morning|midday|afternoon|evening/);
    }
  });

  it('paragliding briefing includes site recommendation bullets', () => {
    const b = generateBriefing('paragliding', {
      currentWind: { speed: 12, gust: 14, direction: 'S' },
      thermalPrediction: { probability: 0.55, windType: 'laminar', startHour: 11, endHour: 17 },
    });
    expect(b.headline).toBeTruthy();
    expect(b.bullets.some((bl) => bl.icon === '🪂')).toBe(true);
  });

  it('minimal path when no substantive forecast and no wind speed', () => {
    const b = generateBriefing('windsurfing', {});
    expect(b.excitement).toBe(1);
    expect(b.bullets).toHaveLength(3);
  });
});
