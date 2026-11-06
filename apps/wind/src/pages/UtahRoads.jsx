import { useEffect, useMemo, useState } from 'react';
import RoadConditionMap from '../components/map/RoadConditionMap';
import { useTheme } from '../context/ThemeContext';
import { fetchAirportVisibility, fetchPassGrids } from '../lib/roadForecast';
import {
  carrySentence,
  normalizeStation,
  pavementNow,
  roadHeadline,
  statewidePlow,
  visibilityCall,
  windCarries,
  windWarning,
} from '../lib/roadState';
import { classifyTerrain } from '../lib/terrainWind';
import { loadUtahElevation } from '../lib/terrariumSampler';

function tone(status, dark) {
  if (status === 'open') return dark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-950';
  if (status === 'caution') return dark ? 'border-amber-400/40 bg-amber-500/10 text-amber-50' : 'border-amber-200 bg-amber-50 text-amber-950';
  if (status === 'closed') return dark ? 'border-rose-500/40 bg-rose-500/15 text-rose-50' : 'border-rose-200 bg-rose-50 text-rose-950';
  return dark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900';
}

function Chip({ kicker, call, dark }) {
  return (
    <div className={`min-w-0 flex-1 rounded-lg border px-2 py-1 ${tone(call?.status, dark)}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{kicker}</p>
      <p className="truncate text-xs font-semibold">{call?.title || 'Reading…'}</p>
    </div>
  );
}

export default function UtahRoads() {
  const { theme } = useTheme();
  const dark = theme !== 'light';
  const [stations, setStations] = useState([]);
  const [stationState, setStationState] = useState('loading');
  const [grids, setGrids] = useState([]);
  const [gridState, setGridState] = useState('loading');
  const [airports, setAirports] = useState([]);
  const [visState, setVisState] = useState('loading');
  const [selected, setSelected] = useState(null);
  const [sampleElevation, setSampleElevation] = useState(null);

  useEffect(() => {
    let cancel = false;
    async function loadStations() {
      try {
        const resp = await fetch('/api/weather?source=udot-roads');
        const body = await resp.json();
        if (cancel) return;
        if (!resp.ok || !Array.isArray(body.stations)) {
          setStationState('unavailable');
          return;
        }
        setStations(body.stations.map(row => normalizeStation(row)).filter(Boolean));
        setStationState('ready');
      } catch {
        if (!cancel) setStationState('unavailable');
      }
    }
    loadStations();
    const timer = setInterval(loadStations, 180000);
    return () => {
      cancel = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    loadUtahElevation()
      .then(sample => {
        if (!cancel && sample) setSampleElevation(() => sample);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  const carries = useMemo(() => windCarries(stations).map(carry => ({
    ...carry,
    ...(sampleElevation
      ? classifyTerrain(
        { lat: carry.fromLat, lon: carry.fromLon },
        { lat: carry.toLat, lon: carry.toLon },
        sampleElevation,
      )
      : { terrain: 'unavailable' }),
  })), [stations, sampleElevation]);

  useEffect(() => {
    let cancel = false;
    fetchPassGrids()
      .then(rows => {
        if (cancel) return;
        setGrids(rows);
        setGridState(rows.length ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (!cancel) setGridState('unavailable');
      });
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    let cancel = false;
    fetchAirportVisibility()
      .then(rows => {
        if (cancel) return;
        setAirports(rows);
        setVisState('ready');
      })
      .catch(() => {
        if (!cancel) setVisState('unavailable');
      });
    return () => { cancel = true; };
  }, []);

  const surface = stationState === 'loading'
    ? null
    : stationState === 'unavailable'
      ? { status: 'unavailable', title: 'Pavement Data Unavailable', detail: 'The UDOT road feed did not come back.' }
      : pavementNow(stations);
  const plow = gridState === 'loading'
    ? null
    : gridState === 'unavailable'
      ? { status: 'unavailable', title: 'Data Unavailable', detail: 'No pass forecast grid. Plows are not dispatched from a blank grid.' }
      : statewidePlow(grids, stations);
  const wind = stationState === 'loading' && gridState === 'loading'
    ? null
    : windWarning(stationState === 'ready' ? stations : [], gridState === 'ready' ? grids : []);
  const vis = visState === 'loading'
    ? null
    : visibilityCall({ meters: airports, grids: gridState === 'ready' ? grids : [] });
  const headline = roadHeadline({ surface, plow, wind, vis, carries });
  const liveCount = stations.filter(s => !s.stale).length;

  const page = dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const bar = dark ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95';

  return (
    <div className={`flex h-dvh flex-col overflow-hidden ${page}`}>
      <header className={`flex h-12 shrink-0 items-center justify-between border-b px-3 ${bar}`}>
        <p className="min-w-0 truncate text-sm font-extrabold tracking-tight text-sky-500">LiftForecast · Utah roads</p>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => { window.location.hash = '#farm'; }} className="rounded-lg px-2 py-1 text-xs">Farm</button>
          <button type="button" onClick={() => { window.location.hash = ''; }} className="rounded-lg px-2 py-1 text-xs">Wind</button>
        </div>
      </header>

      <section className={`shrink-0 border-b px-3 py-2 ${tone(headline.status, dark)}`}>
        <h1 className="text-lg font-semibold leading-tight">{headline.title}</h1>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug">{headline.detail}</p>
        {carries.length > 0 && headline.detail !== carrySentence(carries) && (
          <p className="mt-0.5 line-clamp-1 text-xs leading-snug opacity-80">{carrySentence(carries)}</p>
        )}
      </section>

      <div className="flex shrink-0 gap-1 px-2 py-1">
        <Chip kicker="Pavement" call={surface} dark={dark} />
        <Chip kicker="Plow" call={plow} dark={dark} />
        <Chip kicker="Wind" call={wind} dark={dark} />
        <Chip kicker="Visibility" call={vis} dark={dark} />
      </div>

      <div className="relative min-h-0 flex-1">
        <RoadConditionMap
          stations={stations}
          carries={carries}
          selected={selected}
          onSelect={setSelected}
          sampleElevation={sampleElevation}
        />
        <div className={`pointer-events-none absolute bottom-3 left-3 max-w-[280px] rounded-lg border px-2 py-1.5 text-[11px] leading-snug ${dark ? 'border-slate-700 bg-slate-950/90 text-slate-200' : 'border-slate-200 bg-white/95 text-slate-700'}`}>
          <p>{liveCount ? `${liveCount} live road meters` : 'Road meters loading'}</p>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
            <span>Green dry</span>
            <span>Amber damp</span>
            <span>Blue wet</span>
            <span>White snow</span>
            <span>The colored line is the road. Click it.</span>
            <span>Arrow is wind, 2 mph and up</span>
            <span>Zoom in and the flow bends around a hill. In the lee of a peak it turns back. The ground does not add speed.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
