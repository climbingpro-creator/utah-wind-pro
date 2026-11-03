import { useCallback, useEffect, useMemo, useState } from 'react';
import { getHourlyForecast, tremontonFluidNow } from '@utahwind/weather';
import { VectorWindMap } from '../components/VectorWindMap';
import { useTheme } from '../context/ThemeContext';
import {
  TREMONTON,
  describeMeter,
  forecastHourCall,
  pickFieldMeter,
  readMeters,
  sprayWindow,
  sprinklerWindow,
  valleyDrift,
  waterWindow,
  windTrend,
} from '../lib/farmDecisions';
import { fetchMeterHistory } from '../lib/meterHistory';
import {
  fetchMicroclimate,
  freezeCall,
  humidityCall,
  rainCall,
  snowByTerrain,
  uvCall,
  waterDemand,
} from '../lib/microclimate';

const LOCKED_VIEW = {
  longitude: TREMONTON.lng,
  latitude: TREMONTON.lat,
  zoom: 10,
  pitch: 52,
  bearing: -15,
  name: 'Tremonton',
};

function toneClass(status, dark) {
  if (status === 'open') return dark ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-200 bg-emerald-50';
  if (status === 'caution' || status === 'hold') return dark ? 'border-amber-400/40 bg-amber-500/10' : 'border-amber-200 bg-amber-50';
  if (status === 'closed') return dark ? 'border-rose-500/40 bg-rose-500/10' : 'border-rose-200 bg-rose-50';
  return dark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white';
}

function CallCard({ kicker, call, dark }) {
  const status = call?.status || 'unavailable';
  return (
    <section className={`rounded-xl border p-4 ${toneClass(status, dark)}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{kicker}</p>
      <h2 className="mt-1 text-lg font-semibold">{call?.title || 'Reading the meters…'}</h2>
      <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-700'}`}>
        {call?.detail || 'Waiting on the same station field the wind map uses.'}
      </p>
    </section>
  );
}

function hourLabel(iso) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    hour: 'numeric',
  }).format(new Date(iso));
}

function TrendBars({ points }) {
  const usable = (points || []).filter(p => p.mph != null).slice(-24);
  if (usable.length < 2) return null;
  const max = Math.max(8, ...usable.map(p => p.mph));
  return (
    <div className="mt-3 flex h-16 items-end gap-0.5" aria-hidden="true">
      {usable.map((p, i) => (
        <div
          key={`${p.t || i}`}
          title={p.mph == null ? 'Data Unavailable' : `${Math.round(p.mph)} mph`}
          className="flex-1 rounded-sm bg-sky-500/80"
          style={{ height: `${Math.max(4, (p.mph / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function readingText(meter) {
  if (!meter || meter.stale || meter.speed == null) return 'Data Unavailable';
  const gust = meter.gust == null ? 'gust Data Unavailable' : `gust ${Math.round(meter.gust)} mph`;
  const dir = meter.dir == null ? 'direction Data Unavailable' : `${Math.round(meter.dir)}°`;
  return `${Math.round(meter.speed)} mph, ${gust}, ${dir}`;
}

export default function TremontonFarmTrial() {
  const { theme } = useTheme();
  const dark = theme !== 'light';
  const [field, setField] = useState({ stations: [], loading: false, seen: false });
  const [hours, setHours] = useState(null);
  const [forecastState, setForecastState] = useState('loading');
  const [history, setHistory] = useState({ state: 'waiting', rows: [] });
  const [climate, setClimate] = useState({ state: 'loading', valley: null, ridge: null });

  const onFieldStations = useCallback((stations, loading) => {
    setField(prev => ({
      stations: stations || [],
      loading: !!loading,
      seen: prev.seen || !!loading || (stations?.length > 0),
    }));
  }, []);

  useEffect(() => {
    let cancel = false;
    getHourlyForecast('tremonton')
      .then(rows => {
        if (cancel) return;
        if (!rows?.length) {
          setHours([]);
          setForecastState('unavailable');
          return;
        }
        setHours(rows.slice(0, 12));
        setForecastState('ready');
      })
      .catch(() => {
        if (!cancel) setForecastState('unavailable');
      });
    return () => { cancel = true; };
  }, []);

  const meters = useMemo(() => readMeters(field.stations), [field.stations]);
  const historyIds = useMemo(
    () => meters.filter(m => m.source === 'nws' && m.airshed === 'Bear River Valley').slice(0, 4).map(m => m.id).join(','),
    [meters],
  );

  useEffect(() => {
    if (!historyIds) return undefined;
    let cancel = false;
    setHistory({ state: 'loading', rows: [] });
    fetchMeterHistory(historyIds.split(','), 48).then(rows => {
      if (cancel) return;
      const withPoints = rows.filter(r => r.points?.some(p => p.mph != null));
      setHistory({ state: withPoints.length ? 'ready' : 'unavailable', rows });
    });
    return () => { cancel = true; };
  }, [historyIds]);

  const chosen = pickFieldMeter(meters);
  const bear = meters.filter(m => m.airshed === 'Bear River Valley');
  const cache = meters.filter(m => m.airshed === 'Cache Valley');
  const waiting = !field.seen || (field.loading && !chosen);

  const trendSeries = (history.rows || []).find(r => r.id === chosen?.id && r.points?.length)
    || (history.rows || []).find(r => r.points?.some(p => p.mph != null))
    || null;
  const trend = history.state === 'ready' ? windTrend(trendSeries?.points || []) : null;
  const fluid = useMemo(() => {
    const readings = {};
    for (const m of meters) {
      if (m.stale || m.speed == null || m.dir == null) continue;
      if (m.id === 'KBMC' || m.id === 'KOGD') readings[m.id] = { speed: m.speed, direction: m.dir };
    }
    const kbmc = meters.find(m => m.id === 'KBMC' && !m.stale);
    if (kbmc && kbmc.speed != null && kbmc.dir == null) {
      return {
        status: 'unavailable',
        detail: 'Brigham City airport is reporting, and its wind direction is Data Unavailable. The valley path needs a direction, so the fluid run is Data Unavailable.',
      };
    }
    if (!readings.KBMC && !readings.KOGD) {
      return { status: 'unavailable', detail: 'Data Unavailable. No fresh Brigham or Ogden direction to run through the valley.' };
    }
    return tremontonFluidNow(readings);
  }, [meters]);

  useEffect(() => {
    let cancel = false;
    fetchMicroclimate()
      .then(result => { if (!cancel) setClimate(result); })
      .catch(() => { if (!cancel) setClimate({ state: 'unavailable', valley: null, ridge: null }); });
    return () => { cancel = true; };
  }, []);

  const humidMeter = meters.find(m => m.airshed === 'Bear River Valley' && !m.stale && m.humidity != null) || null;
  const climateSettled = climate.state !== 'loading';
  const rain = climateSettled ? rainCall(climate.valley?.rainIn24 ?? null) : null;
  const snow = climateSettled ? snowByTerrain(climate) : null;
  const humid = !climateSettled && !humidMeter
    ? null
    : humidityCall({
      meterRh: humidMeter?.humidity ?? null,
      meterName: humidMeter?.name,
      forecastRh: climate.valley?.humidityNow ?? null,
    });
  const uv = climateSettled ? uvCall(climate.valley?.uvMax24 ?? null) : null;
  const freeze = climateSettled
    ? freezeCall({
      meterTemp: chosen?.tempF ?? null,
      meterName: chosen?.name,
      valley: climate.valley,
      ridge: climate.ridge,
    })
    : null;
  const demand = climateSettled
    ? waterDemand({ etInches: climate.valley?.etIn24 ?? null, rainInches: climate.valley?.rainIn24 ?? null })
    : null;

  const water = waiting ? null : waterWindow({ meter: chosen, hours: hours || [] });
  const sprinkler = waiting ? null : sprinklerWindow(chosen);
  const spray = waiting ? null : sprayWindow({ meter: chosen, hours: hours || [] });

  const page = dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const panel = dark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white';

  return (
    <div className={`min-h-screen ${page}`}>
      <header className={`sticky top-0 z-40 border-b backdrop-blur ${dark ? 'border-slate-800 bg-slate-950/90' : 'border-slate-200 bg-white/90'}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-extrabold tracking-tight text-sky-500">LiftForecast</p>
            <h1 className="text-base font-semibold">Tremonton fields</h1>
          </div>
          <button
            type="button"
            onClick={() => { window.location.hash = ''; }}
            className={`rounded-lg px-3 py-2 text-sm ${dark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Wind app
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-4 py-4">
        <p className={`text-sm leading-relaxed ${muted}`}>
          Every dot is a wind meter. Arrows are those meters at 2 mph and up. The flow is the fluid field from the same meters, draped on the terrain.
          Cards use the nearest fresh Bear River Valley meter inside 25 miles. Logan stays over the Wellsvilles and out of the call.
        </p>

        <VectorWindMap
          lockedView={LOCKED_VIEW}
          onFieldStations={onFieldStations}
          flowOn
          windData={
            chosen && chosen.speed != null && chosen.dir != null
              ? { speed: chosen.speed, direction: chosen.dir }
              : null
          }
        />

        <p className={`text-sm ${dark ? 'text-slate-200' : 'text-slate-800'}`}>
          {waiting ? 'Reading the meters…' : describeMeter(chosen)}
          {!waiting && chosen ? ` ${valleyDrift(chosen.dir)}` : ''}
        </p>

        <div className="grid gap-3 md:grid-cols-3">
          <CallCard kicker="When to water" call={water} dark={dark} />
          <CallCard kicker="Sprinklers" call={sprinkler} dark={dark} />
          <CallCard kicker="Spray window" call={spray} dark={dark} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <CallCard kicker="Rain, next 24 hours" call={rain} dark={dark} />
          <CallCard kicker="Snow by terrain" call={snow} dark={dark} />
          <CallCard kicker="Humidity" call={humid} dark={dark} />
          <CallCard kicker="UV index" call={uv} dark={dark} />
          <CallCard kicker="Freeze" call={freeze} dark={dark} />
          <CallCard kicker="Weather water demand" call={demand} dark={dark} />
        </div>

        <section className={`rounded-xl border p-4 ${panel}`}>
          <h2 className="text-sm font-semibold">Meter trend, last 48 hours</h2>
          <p className={`mt-1 text-xs ${muted}`}>
            {trendSeries
              ? `${meters.find(m => m.id === trendSeries.id)?.name || trendSeries.id}, National Weather Service, last 48 hours. Not filled in past what that meter stored.`
              : 'Waiting on a Bear River meter with an archive.'}
          </p>
          {history.state === 'loading' && <p className={`mt-2 text-sm ${muted}`}>Reading the meter history…</p>}
          {history.state === 'unavailable' && <p className="mt-2 text-sm text-amber-500">Data Unavailable</p>}
          {history.state === 'ready' && trend && (
            <>
              <p className="mt-2 text-sm font-medium">{trend.title}</p>
              <p className={`mt-1 text-sm ${muted}`}>{trend.detail}</p>
              <TrendBars points={trendSeries?.points} />
            </>
          )}
        </section>

        <section className={`rounded-xl border p-4 ${toneClass(fluid.status === 'ready' ? 'open' : 'unavailable', dark)}`}>
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${muted}`}>Fluid path on the terrain</p>
          <h2 className="mt-1 text-lg font-semibold">{fluid.status === 'ready' ? `${fluid.speed} mph up the valley` : 'Data Unavailable'}</h2>
          <p className={`mt-2 text-sm leading-relaxed ${dark ? 'text-slate-300' : 'text-slate-700'}`}>{fluid.detail}</p>
        </section>

        <section className={`rounded-xl border p-4 ${panel}`}>
          <h2 className="text-sm font-semibold">Bear River Valley meters inside 25 miles</h2>
          {bear.length === 0 ? (
            <p className={`mt-2 text-sm ${muted}`}>Data Unavailable</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {bear.map(m => (
                <li key={m.id} className="flex flex-wrap justify-between gap-2">
                  <span>{m.id === 'KBMC' ? 'Brigham City airport' : m.name} · {m.miles.toFixed(1)} mi · {m.source}</span>
                  <span className={m.stale || m.speed == null ? 'text-amber-500' : ''}>{readingText(m)}</span>
                </li>
              ))}
            </ul>
          )}
          {cache.length > 0 && (
            <>
              <h3 className={`mt-4 text-sm font-semibold ${muted}`}>Over the Wellsvilles — not used</h3>
              <ul className={`mt-2 space-y-1 text-sm ${muted}`}>
                {cache.map(m => (
                  <li key={m.id}>{m.name} · {m.miles.toFixed(1)} mi · Cache Valley</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className={`rounded-xl border p-4 ${panel}`}>
          <h2 className="text-sm font-semibold">Next hours at Tremonton</h2>
          <p className={`mt-1 text-xs ${muted}`}>National Weather Service hourly sustained wind. Gust is not in that feed, so no hour is called gust-safe.</p>
          {forecastState === 'loading' && <p className={`mt-2 text-sm ${muted}`}>Reading the forecast…</p>}
          {forecastState === 'unavailable' && <p className="mt-2 text-sm text-amber-500">Data Unavailable</p>}
          {forecastState === 'ready' && (
            <ul className="mt-3 space-y-2 text-sm">
              {hours.map(hour => {
                const call = forecastHourCall(hour);
                return (
                  <li key={hour.startTime} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-700/20 pb-2">
                    <span className="font-medium">{hourLabel(hour.startTime)}</span>
                    <span className={muted}>
                      {hour.windSpeed == null ? 'Data Unavailable' : `${Math.round(hour.windSpeed)} mph ${hour.windDirection || ''}`}
                      {' · '}
                      {hour.precipChance == null ? 'rain Data Unavailable' : `${hour.precipChance}% rain`}
                    </span>
                    <span>{call.water} · {call.spray}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
