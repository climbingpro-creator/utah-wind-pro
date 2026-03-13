import { useMemo } from 'react';
import { ArrowDown, Wind, Thermometer, Radio, CheckCircle, Circle, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { STATION_NODES, PROPAGATION_EDGES, LOCATION_STATIONS } from '../services/WindFieldEngine';

// Build cascade paths dynamically from the WindFieldEngine's propagation graph
function buildNorthCascade(locationId) {
  const loc = LOCATION_STATIONS[locationId];
  if (!loc) return getDefaultNorthCascade();

  const nodes = [];
  const seen = new Set();

  for (const id of loc.upstreamNorth) {
    if (seen.has(id)) continue;
    seen.add(id);
    const station = STATION_NODES[id];
    if (!station) continue;

    const edge = PROPAGATION_EDGES.find(e => e.from === id && (loc.upstreamNorth.includes(e.to) || e.to === loc.primary));
    nodes.push({
      id,
      name: station.name,
      role: id === loc.upstreamNorth[0] ? 'Origin' : 'Mid-Valley',
      leadTime: edge ? `${edge.delay} min` : '30-60 min',
      headingRange: edge?.headingRange || [270, 45],
      minSpeed: 5,
    });
  }

  const primaryStation = STATION_NODES[loc.primary];
  if (primaryStation && !seen.has(loc.primary)) {
    nodes.push({
      id: loc.primary,
      name: primaryStation.name,
      role: 'Local Gauge',
      leadTime: '5-15 min',
      headingRange: [270, 60],
      minSpeed: 4,
    });
  }

  nodes.push({
    id: 'TARGET',
    name: 'Lake Surface',
    role: 'Destination',
    leadTime: 'Real-time',
    headingRange: null,
    minSpeed: 3,
  });

  return nodes;
}

function buildThermalCascade(locationId) {
  const loc = LOCATION_STATIONS[locationId];
  if (!loc) return getDefaultThermalCascade();

  const nodes = [{
    id: 'RIDGE',
    name: 'Ridge Heating',
    role: 'Thermal Engine',
    leadTime: '60-90 min',
    headingRange: null,
    minSpeed: 0,
  }];

  const seen = new Set(['RIDGE']);

  for (const id of loc.upstreamThermal) {
    if (seen.has(id)) continue;
    seen.add(id);
    const station = STATION_NODES[id];
    if (!station) continue;

    const edge = PROPAGATION_EDGES.find(e => e.from === id);
    nodes.push({
      id,
      name: station.name,
      role: id === 'QSF' ? 'Canyon Source' : 'Valley Indicator',
      leadTime: edge ? `${edge.delay} min` : '15-30 min',
      headingRange: edge?.headingRange || [130, 220],
      minSpeed: 4,
    });
  }

  nodes.push({
    id: 'TARGET',
    name: 'Lake Shore',
    role: 'Thermal Arrival',
    leadTime: 'Real-time',
    headingRange: null,
    minSpeed: 3,
  });

  return nodes;
}

function getDefaultNorthCascade() {
  return [
    { id: 'KSLC', name: 'SLC Airport', role: 'Origin', leadTime: '30-60 min', headingRange: [270, 45], minSpeed: 8 },
    { id: 'UTOLY', name: 'Murray', role: 'Mid-Valley', leadTime: '20-40 min', headingRange: [270, 45], minSpeed: 5 },
    { id: 'UTALP', name: 'Pt of Mountain', role: 'Gateway', leadTime: '10-20 min', headingRange: [270, 60], minSpeed: 5 },
    { id: 'TARGET', name: 'Lake Surface', role: 'Destination', leadTime: 'Real-time', headingRange: null, minSpeed: 3 },
  ];
}

function getDefaultThermalCascade() {
  return [
    { id: 'RIDGE', name: 'Ridge Heating', role: 'Thermal Engine', leadTime: '60-90 min', headingRange: null, minSpeed: 0 },
    { id: 'KPVU', name: 'Provo Airport', role: 'Valley Indicator', leadTime: '15-30 min', headingRange: [130, 220], minSpeed: 4 },
    { id: 'TARGET', name: 'Lake Shore', role: 'Thermal Arrival', leadTime: 'Real-time', headingRange: null, minSpeed: 3 },
  ];
}

function isInRange(dir, range) {
  if (dir == null || !range) return false;
  const [min, max] = range;
  if (min <= max) return dir >= min && dir <= max;
  return dir >= min || dir <= max;
}

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
    case 'FPS': return lakeState.wind?.stations?.find(s => s.id === 'FPS') ?? null;
    case 'QSF': return lakeState.wind?.stations?.find(s => s.id === 'QSF') ?? null;
    case 'SND': return lakeState.wind?.stations?.find(s => s.id === 'SND') ?? null;
    case 'KHCR': return lakeState.wind?.stations?.find(s => s.id === 'KHCR') ?? null;
    case 'KHIF': return lakeState.wind?.stations?.find(s => s.id === 'KHIF') ?? null;
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

function isRidgeActive() {
  const h = new Date().getHours();
  return h >= 10 && h <= 18;
}

function isNodeActive(node, station) {
  if (node.id === 'RIDGE') return isRidgeActive();
  if (!station || station.speed == null) return false;
  if (node.headingRange && !isInRange(station.direction, node.headingRange)) return false;
  return station.speed >= (node.minSpeed || 3);
}

function computeEta(nodes, stationMap) {
  let firstActiveIdx = -1;
  let lastActiveIdx = -1;
  for (let i = 0; i < nodes.length; i++) {
    const s = stationMap[nodes[i].id];
    if (isNodeActive(nodes[i], s)) {
      if (firstActiveIdx === -1) firstActiveIdx = i;
      lastActiveIdx = i;
    }
  }
  const targetIdx = nodes.length - 1;
  const targetStation = stationMap[nodes[targetIdx].id];
  const targetActive = isNodeActive(nodes[targetIdx], targetStation);

  if (firstActiveIdx >= 0 && !targetActive) {
    const nextNode = nodes[lastActiveIdx + 1] ?? nodes[lastActiveIdx];
    return { station: nodes[firstActiveIdx].name, eta: nextNode.leadTime };
  }
  return null;
}

function CascadeNode({ node, station, active, isDark, speedPct }) {
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

      {/* Speed bar — proportional visualization */}
      {speed != null && (
        <div className="w-16 h-1.5 rounded-full bg-slate-700/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${active ? 'bg-green-400' : 'bg-slate-500'}`}
            style={{ width: `${Math.min(100, (speed / 25) * 100)}%` }}
          />
        </div>
      )}

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
      <span className={`text-[10px] ${textColor}`}>
        {inTransit ? `⏳ ETA: ${leadTime}` : leadTime}
      </span>
    </div>
  );
}

function CascadePath({ title, icon, nodes, lakeState, isDark, grayed }) {
  const stationMap = useMemo(() => {
    const map = {};
    for (const node of nodes) {
      map[node.id] = normalizeStation(resolveStation(node.id, lakeState));
    }
    return map;
  }, [nodes, lakeState]);

  const actives = useMemo(() =>
    nodes.map(n => !grayed && isNodeActive(n, stationMap[n.id])),
    [nodes, stationMap, grayed]);

  const eta = useMemo(() => grayed ? null : computeEta(nodes, stationMap), [nodes, stationMap, grayed]);

  const activeCount = actives.filter(Boolean).length;
  const titleColor = grayed
    ? (isDark ? 'text-slate-600' : 'text-slate-300')
    : (isDark ? 'text-slate-200' : 'text-slate-800');

  return (
    <div className={grayed ? 'opacity-40' : ''}>
      <div className={`flex items-center gap-1.5 mb-2 text-xs font-semibold ${titleColor}`}>
        {icon}
        {title}
        {!grayed && activeCount > 0 && (
          <span className="ml-auto text-[10px] text-green-400 flex items-center gap-0.5">
            <Zap className="w-3 h-3" />
            {activeCount}/{nodes.length} active
          </span>
        )}
      </div>
      <div className="space-y-0">
        {nodes.map((node, i) => (
          <div key={`${node.id}-${i}`}>
            <CascadeNode
              node={node}
              station={stationMap[node.id]}
              active={actives[i]}
              isDark={isDark}
            />
            {i < nodes.length - 1 && (
              <CascadeConnector
                leadTime={nodes[i + 1].leadTime}
                fromActive={actives[i]}
                toActive={actives[i + 1]}
                isDark={isDark}
              />
            )}
          </div>
        ))}
      </div>
      {eta && (
        <div className={`mt-2 text-[10px] px-2 py-1 rounded ${isDark ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700'}`}>
          Flow detected at {eta.station} — ETA to lake: ~{eta.eta}
        </div>
      )}
    </div>
  );
}

export default function IndicatorCascade({ lakeState, activity, locationId }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isParagliding = activity === 'paragliding';

  // Build cascade paths from WindFieldEngine's propagation graph
  const northNodes = useMemo(() => buildNorthCascade(locationId), [locationId]);
  const thermalNodes = useMemo(() => buildThermalCascade(locationId), [locationId]);

  const kslc = normalizeStation(lakeState?.kslcStation);
  const kpvu = normalizeStation(lakeState?.kpvuStation);

  const hasNorthFlow = kslc?.speed >= 8 && (kslc?.direction >= 270 || kslc?.direction <= 45);
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
        <span className={`ml-auto text-[10px] font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Physics-based propagation
        </span>
      </h3>

      {neitherActive && (
        <div className={`text-[10px] mb-3 px-2 py-1 rounded ${isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
          No active flow detected — monitoring all upstream stations
        </div>
      )}

      <div className="space-y-4">
        {northFirst ? (
          <>
            {showNorth && (
              <CascadePath
                title="North Flow Path"
                icon={<Wind className="w-3.5 h-3.5 text-blue-400" />}
                nodes={northNodes}
                lakeState={lakeState}
                isDark={isDark}
                grayed={neitherActive && !isParagliding}
              />
            )}
            {showThermal && (
              <CascadePath
                title="Thermal Path"
                icon={<Thermometer className="w-3.5 h-3.5 text-orange-400" />}
                nodes={thermalNodes}
                lakeState={lakeState}
                isDark={isDark}
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
                nodes={thermalNodes}
                lakeState={lakeState}
                isDark={isDark}
                grayed={neitherActive}
              />
            )}
            {showNorth && (
              <CascadePath
                title="North Flow Path"
                icon={<Wind className="w-3.5 h-3.5 text-blue-400" />}
                nodes={northNodes}
                lakeState={lakeState}
                isDark={isDark}
                grayed={neitherActive}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
