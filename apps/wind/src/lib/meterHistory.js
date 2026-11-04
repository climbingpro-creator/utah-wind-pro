/**
 * Recent observations for meters the map already found.
 * National Weather Service keeps about a week. This asks for 48 hours.
 * A failed or empty station is returned with no points. Nothing is filled in.
 */

const KMH_TO_MPH = 0.621371;

export async function fetchMeterHistory(stationIds, hours = 48) {
  const ids = [...new Set((stationIds || []).filter(Boolean))].slice(0, 4);
  const end = new Date();
  const start = new Date(end.getTime() - hours * 3600_000);
  const rows = await Promise.all(ids.map(async (id) => {
    const params = new URLSearchParams({
      start: start.toISOString(),
      end: end.toISOString(),
      limit: '500',
    });
    const url = `https://api.weather.gov/stations/${encodeURIComponent(id)}/observations?${params}`;
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/geo+json' } });
      if (!resp.ok) return { id, points: [], error: resp.status };
      const json = await resp.json();
      const points = [];
      for (const feature of [...(json.features || [])].reverse()) {
        const p = feature.properties || {};
        const raw = p.windSpeed?.value;
        const mph = raw == null ? null : +(raw * KMH_TO_MPH).toFixed(1);
        if (mph != null && (mph < 0 || mph > 100)) continue;
        const gustRaw = p.windGust?.value;
        const gust = gustRaw == null ? null : +(gustRaw * KMH_TO_MPH).toFixed(1);
        const tempC = p.temperature?.value;
        const tempF = tempC == null ? null : +((tempC * 9) / 5 + 32).toFixed(1);
        points.push({
          t: p.timestamp,
          mph,
          gust: gust != null && gust >= 0 && gust <= 120 ? gust : null,
          dir: p.windDirection?.value ?? null,
          tempF: tempF != null && tempF >= -40 && tempF <= 120 ? tempF : null,
        });
      }
      return { id, points };
    } catch {
      return { id, points: [], error: 'unavailable' };
    }
  }));
  return rows;
}
