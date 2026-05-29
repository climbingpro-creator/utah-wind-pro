/**
 * Quick audit: how many unique wind meters are wired up across the Utah Wind stack?
 *
 * Counts unique station IDs across:
 *   - STATION_REGISTRY        (master metadata)
 *   - LAKE_CONFIGS            (per-spot pressure/ridge/lakeshore/reference/predictor)
 *   - WU_PWS_STATIONS         (Weather Underground curated network)
 *   - RADIAL_STATIONS         (server-side radial pinger in api/weather.js)
 *
 * Buckets by source network for clear reporting.
 */

const { STATION_REGISTRY } = await import('../packages/weather/src/config/stationRegistry.js');
const { LAKE_CONFIGS } = await import('../packages/weather/src/config/lakeStations.js');
const { WU_PWS_STATIONS } = await import('../packages/weather/src/config/wuPwsNetwork.js');

const all = new Map();   // id -> { id, source, network, name }

function classify(id) {
  if (!id) return 'unknown';
  if (id === 'PWS') return 'ambient-pws';
  if (id.startsWith('TEMPEST_')) return 'tempest-pws';
  if (id.startsWith('KUT') || id.startsWith('KWY')) return 'wu-pws';
  if (id.startsWith('K') && id.length === 4) return 'nws-airport';
  if (id.startsWith('UT') || id.startsWith('WY') || id.startsWith('UR')) return 'udot-rwis';
  // Synoptic mesonet IDs (3-5 chars, alphanumeric) — these are legacy refs
  return 'synoptic-mesonet';
}

function add(id, name, sourceLayer) {
  if (!id) return;
  if (!all.has(id)) {
    const network = classify(id);
    all.set(id, { id, network, sources: new Set(), names: new Set() });
  }
  const entry = all.get(id);
  entry.sources.add(sourceLayer);
  if (name) entry.names.add(name);
}

// ─── STATION_REGISTRY ─────────────────────────────────────────────────────
for (const [id, s] of Object.entries(STATION_REGISTRY)) {
  add(id, s.name || s.shortName, 'registry');
}

// ─── LAKE_CONFIGS ─────────────────────────────────────────────────────────
const spotsUsing = new Map();   // id -> Set of spot names
function tag(stationId, spotName) {
  if (!stationId) return;
  if (!spotsUsing.has(stationId)) spotsUsing.set(stationId, new Set());
  spotsUsing.get(stationId).add(spotName);
}

for (const [lakeId, cfg] of Object.entries(LAKE_CONFIGS)) {
  const spotName = cfg.shortName || cfg.name || lakeId;
  const ph = cfg.stations?.pressure?.high;
  const pl = cfg.stations?.pressure?.low;
  if (ph) { add(ph.id, ph.name, 'lake-pressure'); tag(ph.id, spotName); }
  if (pl) { add(pl.id, pl.name, 'lake-pressure'); tag(pl.id, spotName); }
  for (const s of (cfg.stations?.ridge || []))     { add(s.id, s.name, 'lake-ridge');     tag(s.id, spotName); }
  for (const s of (cfg.stations?.lakeshore || [])) { add(s.id, s.name, 'lake-lakeshore'); tag(s.id, spotName); }
  for (const s of (cfg.stations?.reference || [])) { add(s.id, s.name, 'lake-reference'); tag(s.id, spotName); }
  for (const s of (cfg.stations?.predictor || [])) { add(s.id, s.name, 'lake-predictor'); tag(s.id, spotName); }
  if (cfg.stations?.groundTruth) {
    add(cfg.stations.groundTruth.id, cfg.stations.groundTruth.name, 'lake-ground-truth');
    tag(cfg.stations.groundTruth.id, spotName);
  }
}

// ─── WU_PWS_STATIONS ──────────────────────────────────────────────────────
for (const [, group] of Object.entries(WU_PWS_STATIONS)) {
  for (const s of (group.stations || [])) {
    add(s.id, s.name, 'wu-pws-network');
  }
}

// ─── Tally ────────────────────────────────────────────────────────────────
const byNetwork = {};
for (const [, e] of all) {
  byNetwork[e.network] = (byNetwork[e.network] || 0) + 1;
}

// Filter to UTAH-area station IDs only (drop non-Utah/Wyoming or out-of-state aviation)
const UTAH_AIRPORT_PREFIXES = ['KSLC','KPVU','KOGD','KHCR','KU42','KSGU','KLGU','KCDC','KVEL','KPGA','KBMC','KHIF','KENV','KEVW','KFIR','KU24','KU28','KU16','KU30','KU34','KU36','KU55','KU56','KU58','KU60','KU63','KU64','KU67','KU68','KU69','KU70','KU72','KU76','KU78','KMLF','KCNY','KBCE','KSGU'];

const inUtahRegion = new Map();
for (const [id, e] of all) {
  const lat = STATION_REGISTRY?.[id]?.lat;
  const lng = STATION_REGISTRY?.[id]?.lng;
  let isUtah = false;
  // Region check via registry coords (Utah bbox ~36.5–42.5°N, -114 to -109°W)
  if (lat != null && lng != null) {
    isUtah = lat >= 36.5 && lat <= 42.5 && lng >= -114 && lng <= -109;
  } else {
    // Heuristic by ID prefix when no coords
    if (id.startsWith('KUT') || id.startsWith('UT') || id.startsWith('UR')) isUtah = true;
    else if (UTAH_AIRPORT_PREFIXES.includes(id)) isUtah = true;
    else if (id === 'PWS') isUtah = true;  // Ambient at Saratoga
    else if (id.startsWith('TEMPEST_')) isUtah = true;
  }
  if (isUtah) inUtahRegion.set(id, e);
}

const byNetworkUtah = {};
for (const [, e] of inUtahRegion) {
  byNetworkUtah[e.network] = (byNetworkUtah[e.network] || 0) + 1;
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('  UTAH WIND METER COUNT — ALL UNIQUE STATIONS WIRED UP');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`Total unique stations across all configs:  ${all.size}`);
console.log(`Within Utah/Wyoming border region:         ${inUtahRegion.size}\n`);

console.log('── BY NETWORK (Utah region only) ────────────────────────────');
const ordered = Object.entries(byNetworkUtah).sort((a, b) => b[1] - a[1]);
for (const [net, n] of ordered) {
  console.log(`  ${net.padEnd(20)} ${String(n).padStart(4)} meters`);
}

console.log('\n── BY NETWORK (all configured, incl. neighboring states) ───');
for (const [net, n] of Object.entries(byNetwork).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${net.padEnd(20)} ${String(n).padStart(4)} meters`);
}

console.log('\n── TOP 15 MOST-REFERENCED STATIONS ──────────────────────────');
const ranked = [...spotsUsing.entries()]
  .map(([id, spots]) => ({ id, count: spots.size, spots: [...spots] }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 15);
for (const r of ranked) {
  const name = STATION_REGISTRY?.[r.id]?.shortName || STATION_REGISTRY?.[r.id]?.name || r.id;
  console.log(`  ${r.id.padEnd(16)} ${String(r.count).padStart(3)} spots  — ${name}`);
}

console.log('\n── PER-SPOT METER DENSITY ───────────────────────────────────');
const perSpot = [];
for (const [lakeId, cfg] of Object.entries(LAKE_CONFIGS)) {
  const ids = new Set();
  if (cfg.stations?.pressure?.high?.id) ids.add(cfg.stations.pressure.high.id);
  if (cfg.stations?.pressure?.low?.id)  ids.add(cfg.stations.pressure.low.id);
  for (const s of (cfg.stations?.ridge || []))     ids.add(s.id);
  for (const s of (cfg.stations?.lakeshore || [])) ids.add(s.id);
  for (const s of (cfg.stations?.reference || [])) ids.add(s.id);
  for (const s of (cfg.stations?.predictor || [])) ids.add(s.id);
  if (cfg.stations?.groundTruth?.id) ids.add(cfg.stations.groundTruth.id);
  // WU PWS network adds extras
  const wuExtras = WU_PWS_STATIONS?.[lakeId]?.stations?.length || 0;
  perSpot.push({ lakeId, name: cfg.shortName || cfg.name, core: ids.size, wuExtras, total: ids.size + wuExtras });
}
perSpot.sort((a, b) => b.total - a.total);
for (const s of perSpot.slice(0, 12)) {
  console.log(`  ${s.lakeId.padEnd(24)} core=${String(s.core).padStart(2)}  wu=${String(s.wuExtras).padStart(2)}  total=${s.total}`);
}
console.log(`  ... and ${perSpot.length - 12} more spots`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  HEADLINE: ${inUtahRegion.size} UNIQUE WIND METERS IN UTAH REGION`);
console.log('═══════════════════════════════════════════════════════════════');
