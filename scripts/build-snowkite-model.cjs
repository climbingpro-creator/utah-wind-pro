/**
 * BUILD SNOWKITE MODEL — Compresses historical patterns into a lightweight
 * JSON model that the app loads at runtime for AI predictions.
 * 
 * Input:  scripts/data/snowkite-patterns.json (full analysis)
 * Output: src/config/snowkiteModel.json (compact, < 30KB)
 * 
 * Usage: node scripts/build-snowkite-model.cjs
 */

const fs = require('fs');
const path = require('path');

const patternsPath = path.join(__dirname, 'data', 'snowkite-patterns.json');
const outputPath = path.join(__dirname, '..', 'src', 'config', 'snowkiteModel.json');

const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));

const SNOWKITE_STATIONS = ['UTCOP', 'UTDAN', 'DSTU1', 'CCPUT', 'RVZU1', 'SKY', 'UTESU', 'UTMPK', 'UTHTP', 'KSLC'];

const model = {
  version: '1.0.0',
  generated: new Date().toISOString(),
  dataRange: { start: '2025-03', end: '2026-03' },
  totalObservations: 104373,
  stations: {},
  correlations: {},
  snowkiteWindows: {},
};

for (const stid of SNOWKITE_STATIONS) {
  const p = patterns[stid];
  if (!p) continue;

  model.stations[stid] = {
    name: p.name,
    byMonth: {},
    byHour: {},
    topDirections: [],
    snowkiteDays: p.snowkiteDays?.length || 0,
  };

  for (const [mon, d] of Object.entries(p.byMonth || {})) {
    model.stations[stid].byMonth[mon] = {
      avg: d.avgSpeed,
      pct10: d.pctStrong,
      dir: d.dominantDir,
      gust: d.avgGust,
    };
  }

  for (const [hr, d] of Object.entries(p.byHour || {})) {
    model.stations[stid].byHour[hr] = {
      avg: d.avgSpeed,
      pct10: d.pctStrong,
    };
  }

  const rose = p.directionRose || {};
  const sortedDirs = Object.entries(rose)
    .sort((a, b) => b[1].strong - a[1].strong)
    .slice(0, 6);
  model.stations[stid].topDirections = sortedDirs.map(([dir, d]) => ({
    dir,
    count: d.count,
    avg: d.avgSpeed,
    strong: d.strong,
  }));
}

const locations = {
  'strawberry-ladders': { primary: 'UTCOP', ridge: 'CCPUT', upstream: 'KSLC' },
  'strawberry-bay':     { primary: 'UTCOP', ridge: 'CCPUT', upstream: 'KSLC' },
  'strawberry-soldier': { primary: 'RVZU1', ridge: 'CCPUT', upstream: 'KSLC' },
  'strawberry-view':    { primary: 'UTCOP', ridge: 'CCPUT', upstream: 'KSLC' },
  'strawberry-river':   { primary: 'UTCOP', ridge: 'CCPUT', upstream: 'KSLC' },
  'skyline-drive':      { primary: 'SKY',   ridge: 'UTMPK', upstream: 'KSLC' },
};

for (const [locId, cfg] of Object.entries(locations)) {
  const primaryData = model.stations[cfg.primary];
  const ridgeData = model.stations[cfg.ridge];

  if (!primaryData || !ridgeData) continue;

  const peakHours = Object.entries(primaryData.byHour)
    .filter(([h]) => parseInt(h) >= 8 && parseInt(h) <= 18)
    .sort((a, b) => b[1].avg - a[1].avg)
    .slice(0, 4)
    .map(([h]) => parseInt(h))
    .sort((a, b) => a - b);

  const bestMonths = Object.entries(primaryData.byMonth)
    .sort((a, b) => b[1].pct10 - a[1].pct10)
    .slice(0, 4)
    .map(([m, d]) => ({ month: parseInt(m), pct: d.pct10, avg: d.avg }));

  model.snowkiteWindows[locId] = {
    primary: cfg.primary,
    ridge: cfg.ridge,
    peakHours,
    bestMonths,
    dailyPeakStart: peakHours.length ? peakHours[0] : 10,
    dailyPeakEnd: peakHours.length ? peakHours[peakHours.length - 1] + 1 : 16,
  };

  if (ridgeData && primaryData) {
    const ridgeMonths = Object.values(ridgeData.byMonth);
    const primaryMonths = Object.values(primaryData.byMonth);
    const ridgeAvg = ridgeMonths.length ? ridgeMonths.reduce((s, m) => s + m.avg, 0) / ridgeMonths.length : 0;
    const primaryAvg = primaryMonths.length ? primaryMonths.reduce((s, m) => s + m.avg, 0) / primaryMonths.length : 0;

    model.correlations[`${cfg.ridge}→${cfg.primary}`] = {
      ratio: primaryAvg && ridgeAvg ? Math.round((primaryAvg / ridgeAvg) * 100) / 100 : 0,
      ridgeAvg: Math.round(ridgeAvg * 10) / 10,
      surfaceAvg: Math.round(primaryAvg * 10) / 10,
    };
  }
}

const _kslcHourly = model.stations.KSLC?.byHour || {};
const _ccputHourly = model.stations.CCPUT?.byHour || {};
const _utmpkHourly = model.stations.UTMPK?.byHour || {};
const _utcopHourly = model.stations.UTCOP?.byHour || {};
const _skyHourly = model.stations.SKY?.byHour || {};

model.propagationModel = {
  'KSLC→UTCOP': {
    delayHours: 3,
    attenuation: 0.65,
    note: 'SLC fronts reach Strawberry with ~3hr delay, 35% speed loss',
  },
  'CCPUT→UTCOP': {
    delayHours: 1,
    attenuation: 0.42,
    note: 'Ridge wind at Currant Creek descends to reservoir level with ~58% loss',
  },
  'KSLC→SKY': {
    delayHours: 4,
    attenuation: 0.55,
    note: 'SLC fronts reach Skyline with ~4hr delay, 45% speed loss',
  },
  'UTMPK→SKY': {
    delayHours: 0.5,
    attenuation: 0.29,
    note: 'Monument Peak ridge wind reaches Skyline surface with ~71% loss',
  },
};

const json = JSON.stringify(model, null, 2);
fs.writeFileSync(outputPath, json);

const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
console.log(`✅ Snowkite model built: ${outputPath}`);
console.log(`   Size: ${sizeKB} KB`);
console.log(`   Stations: ${Object.keys(model.stations).length}`);
console.log(`   Locations: ${Object.keys(model.snowkiteWindows).length}`);
console.log(`   Correlations: ${Object.keys(model.correlations).length}`);
console.log('\n   Propagation model:');
for (const [route, cfg] of Object.entries(model.propagationModel)) {
  console.log(`     ${route}: delay=${cfg.delayHours}hr, atten=${cfg.attenuation}, ${cfg.note}`);
}
console.log('\n   Peak windows:');
for (const [loc, w] of Object.entries(model.snowkiteWindows)) {
  console.log(`     ${loc.padEnd(22)} peak ${w.dailyPeakStart}:00-${w.dailyPeakEnd}:00  best months: ${w.bestMonths.map(m => ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m.month] + '(' + m.pct + '%)').join(', ')}`);
}
