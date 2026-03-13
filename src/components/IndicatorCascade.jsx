import { useMemo } from 'react';
import { ArrowDown, Wind, Thermometer, Radio, CheckCircle, Circle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const NORTH_CASCADE = [
  { id: 'KSLC', name: 'SLC Airport', role: 'Origin', leadTime: '30-60 min',
    isActive: (s) => s?.speed >= 8 && (s?.direction >= 280 || s?.direction <= 45) },
  { id: 'UTOLY', name: 'Murray', role: 'Mid-Valley', leadTime: '20-40 min',
    isActive: (s) => s?.speed >= 5 && (s?.direction >= 280 || s?.direction <= 45) },
  { id: 'UTALP', name: 'Pt of Mountain', role: 'Gateway', leadTime: '10-20 min',
    isActive: (s) => s?.speed >= 5 && (s?.direction >= 280 || s?.direction <= 60) },
  { id: 'TARGET', name: 'Lake Surface', role: 'Destination', leadTime: 'Real-time',
    isActive: (s) => s?.speed >= 5 }
];

const THERMAL_CASCADE = [
  { id: 'RIDGE', name: 'Ridge Heating', role: 'Thermal Engine', leadTime: '60-90 min',
    isActive: () => false },
  { id: 'KPVU', name: 'Provo Airport', role: 'Valley Indicator', leadTime: '15-30 min',
    isActive: (s) => s?.speed >= 4 && s?.direction >= 130 && s?.direction <= 220 },
  { id: 'TARGET', name: 'Lake Shore', role: 'Thermal Arrival', leadTime: 'Real-time',
    isActive: () => false }
];

function dirLabel(deg) {
  if (deg == null) return '--';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function resolveStation(nodeId, lakeState) {
  if (!lakeState) return null;
  switch (nodeId) {
    case 'KSLC': return lakeState.kslcStation ?? null;
    case 'KPVU': return lakeState.kpvuStation ?? null;
    case 'UTALP': return lakeState.utalpStation ?? lakeState.wind?.stations?.find(s => s.id === 'UTALP') ?? null;
    case 'UTOLY': return lakeState.wind?.stations?.find(s => s.id === 'UTOLY') ?? null;
    case 'TARGET': return lakeState.pws ?? lakeState.wind?.stations?.[0] ?? null;
    case 'RIDGE': return null;
    default: return null;
  }
}

function normalizeStation(raw) {
  if (!raw) return null;
  return {
    speed: raw.speed ?? raw.windSpeed ?? null,
    direction: raw.direction ?? raw.windDirection ?? null,
    gust: raw.gust ?? raw.windGust ?? null,
  };
}

// Ridge is "active" if it's daytime (7am-7pm) — solar heating proxy
function isRidgeActive() {
  const h = new Date().getHours();
  return h >= 10 && h <= 18;
}

function computeEta(nodes, stationMap) {
  let firstActiveIdx = -1;
  let lastActiveIdx = -1;
  for (let i = 0; i < nodes.length; i++) {
    const s = stationMap[nodes[i].id];
    const active = nodes[i].id === 'RIDGE' ? isRidgeActive() : nodes[i].isActive(s);
    if (active && firstActiveIdx === -1) firstActiveIdx = i;
    if (active) lastActiveIdx = i;
  }
  const targetIdx = nodes.length - 1;
  const targetActive = nodes[targetIdx].id === 'RIDGE'
    ? isRidgeActive()
    : nodes[targetIdx].isActive(stationMap[nodes[targetIdx].id]);

  if (firstActiveIdx >= 0 && !targetActive) {
    const leadStr = nodes[lastActiveIdx + 1]?.leadTime ?? nodes[lastActiveIdx]?.leadTime;
    return { station: nodes[firstActiveIdx].name, eta: leadStr };
  }
  return null;
}

function CascadeNode({ node, station, active, isDark, isParagliding }) {
  const speed = station?.speed;
  const dir = station?.direction;

  const bg = active
    ? (isDark ? 'bg-green-900/30 border-green-700/50' : 'bg-green-50 border-green-300')
    : (isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200');

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} transition-colors duration-300`}>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
          {node.name}
        </div>
        <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {node.role}
        </div>
      </div>

      <div className="text-center shrink-0 w-20">
        {speed != null ? (
          <div className={`text-xs font-bold tabular-nums ${active ? 'text-green-400' : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
            {Math.round(speed)} mph {dirLabel(dir)}
          </div>
        ) : node.id === 'RIDGE' ? (
          <div className={`text-[10px] ${isRidgeActive() ? 'text-orange-400' : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
            {isRidgeActive() ? 'Heating' : 'Cool'}
          </div>
        ) : (
          <div className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>--</div>
        )}
      </div>

      <div className="shrink-0">
        {active
          ? <CheckCircle className="w-4 h-4 text-green-400" />
          : <Circle className={`w-4 h-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />}
      </div>
    </div>
  );
}

function CascadeConnector({ leadTime, fromActive, toActive, isDark }) {
  const flowing = fromActive && toActive;
  const inTransit = fromActive && !toActive;

  let lineColor, textColor;
  if (flowing) {
    lineColor = isDark ? 'border-green-500' : 'border-green-400';
    textColor = 'text-green-400';
  } else if (inTransit) {
    lineColor = isDark ? 'border-yellow-500/60 border-dashed' : 'border-yellow-400/60 border-dashed';
    textColor = 'text-yellow-500';
  } else {
    lineColor = isDark ? 'border-slate-700' : 'border-slate-200';
    textColor = isDark ? 'text-slate-600' : 'text-slate-300';
  }

  return (
    <div className="flex items-center gap-2 pl-6 py-0.5">
      <div className={`w-0 h-5 border-l-2 ${lineColor} transition-colors duration-300`} />
      <ArrowDown className={`w-3 h-3 ${textColor}`} />
      <span className={`text-[10px] ${textColor}`}>{leadTime}</span>
    </div>
  );
}

function CascadePath({ title, icon, nodes, lakeState, isDark, isParagliding, grayed }) {
  const stationMap = useMemo(() => {
    const map = {};
    for (const node of nodes) {
      map[node.id] = normalizeStation(resolveStation(node.id, lakeState));
    }
    return map;
  }, [nodes, lakeState]);

  const actives = useMemo(() =>
    nodes.map(n => {
      if (n.id === 'RIDGE') return isRidgeActive();
      return n.isActive(stationMap[n.id]);
    }), [nodes, stationMap]);

  const eta = useMemo(() => computeEta(nodes, stationMap), [nodes, stationMap]);

  const titleColor = grayed
    ? (isDark ? 'text-slate-600' : 'text-slate-300')
    : (isDark ? 'text-slate-200' : 'text-slate-800');

  return (
    <div className={grayed ? 'opacity-40' : ''}>
      <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold ${titleColor}`}>
        {icon}
        {title}
      </div>
      <div className="space-y-0">
        {nodes.map((node, i) => (
          <div key={`${node.id}-${i}`}>
            <CascadeNode
              node={node}
              station={stationMap[node.id]}
              active={!grayed && actives[i]}
              isDark={isDark}
              isParagliding={isParagliding}
            />
            {i < nodes.length - 1 && (
              <CascadeConnector
                leadTime={nodes[i + 1].leadTime}
                fromActive={!grayed && actives[i]}
                toActive={!grayed && actives[i + 1]}
                isDark={isDark}
              />
            )}
          </div>
        ))}
      </div>
      {!grayed && eta && (
        <div className={`mt-2 text-[10px] px-2 py-1 rounded ${isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
          Flow detected at {eta.station} — ETA to lake: ~{eta.eta}
        </div>
      )}
    </div>
  );
}

export default function IndicatorCascade({ lakeState, activity }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isParagliding = activity === 'paragliding';

  const kslc = normalizeStation(lakeState?.kslcStation);
  const kpvu = normalizeStation(lakeState?.kpvuStation);

  const hasNorthFlow = kslc?.speed >= 8 && (kslc?.direction >= 280 || kslc?.direction <= 45);
  const hasThermalFlow = kpvu?.speed >= 4 && kpvu?.direction >= 130 && kpvu?.direction <= 220;
  const neitherActive = !hasNorthFlow && !hasThermalFlow;

  const showNorth = hasNorthFlow || neitherActive || isParagliding;
  const showThermal = hasThermalFlow || neitherActive;

  const northFirst = isParagliding || hasNorthFlow;

  const cardBg = isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200';

  return (
    <div className={`rounded-xl p-3 border ${cardBg}`}>
      <h3 className={`text-xs font-semibold mb-3 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
        <Radio className="w-4 h-4 text-cyan-400" />
        Wind Flow Cascade
      </h3>

      {neitherActive && (
        <div className={`text-[10px] mb-3 px-2 py-1 rounded ${isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
          No active flow detected
        </div>
      )}

      <div className={`space-y-4 ${isParagliding ? '' : ''}`}>
        {northFirst ? (
          <>
            {showNorth && (
              <CascadePath
                title="North Flow Path"
                icon={<Wind className="w-3.5 h-3.5 text-blue-400" />}
                nodes={NORTH_CASCADE}
                lakeState={lakeState}
                isDark={isDark}
                isParagliding={isParagliding}
                grayed={neitherActive && !isParagliding}
              />
            )}
            {showThermal && (
              <CascadePath
                title="Thermal Path"
                icon={<Thermometer className="w-3.5 h-3.5 text-orange-400" />}
                nodes={THERMAL_CASCADE}
                lakeState={lakeState}
                isDark={isDark}
                isParagliding={false}
                grayed={neitherActive}
              />
            )}
          </>
        ) : (
          <>
            {showThermal && (
              <CascadePath
                title="Thermal Path"
                icon={<Thermometer className="w-3.5 h-3.5 text-orange-400" />}
                nodes={THERMAL_CASCADE}
                lakeState={lakeState}
                isDark={isDark}
                isParagliding={false}
                grayed={neitherActive}
              />
            )}
            {showNorth && (
              <CascadePath
                title="North Flow Path"
                icon={<Wind className="w-3.5 h-3.5 text-blue-400" />}
                nodes={NORTH_CASCADE}
                lakeState={lakeState}
                isDark={isDark}
                isParagliding={isParagliding}
                grayed={neitherActive}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
