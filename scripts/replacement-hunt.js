#!/usr/bin/env node
/**
 * Replacement Station Hunter
 *
 * For every Synoptic station NOT in the paid-10 list, scans the Synoptic
 * radius search, Tempest, and WU nearby APIs to find candidate replacements.
 *
 * Usage: node scripts/replacement-hunt.js
 *
 * Requires: SYNOPTIC_TOKEN in .env (or environment)
 * Optional: WU_API_KEY for WU nearby scan
 */

import 'dotenv/config';

const SYNOPTIC_TOKEN = process.env.SYNOPTIC_TOKEN;
const WU_API_KEY = process.env.WU_API_KEY;

const PAID_10 = new Set(['FPS', 'UTALP', 'AMFKM', 'UTLAK', 'UTSHR', 'SND', 'UTDCD', 'QSF', 'UP218', 'UTCOP']);

const AIRPORTS = new Set([
  'KSLC', 'KPVU', 'KHCR', 'KOGD', 'KLGU', 'KHIF', 'KVEL', 'KPUC',
  'KSGU', 'KPGA', 'KCDC', 'KFGR', 'KBMC', 'KEVW', 'KFIR',
]);

const DROPPED_STATIONS = [
  'UID28', 'CSC', 'UTOLY', 'UTORM', 'UTPCR', 'UT7', 'UTPRB', 'UTRVT',
  'DSTU1', 'TIMU1',
  'UTDAN', 'CCPUT', 'UTHEB', 'UWCU1', 'RVZU1', 'UTSLD',
  'BERU1', 'UTGRC', 'UTLTS',
  'SKY', 'UTESU', 'UTMPK', 'EPMU1', 'UTHTP',
  'UT1',
  'QLN', 'MDAU1', 'UTPCY', 'UTLPC', 'UTCHL',
  'UR328', 'BLPU1', 'OGP', 'GSLM', 'UTANT', 'UTFRW',
  'COOPOGNU1', 'PC496', 'UTPVD', 'UTHUN',
  'UTLMP', 'UTRKY', 'UTSCI',
  'UTPOW', 'UTMON',
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getSynopticMeta(stids) {
  const url = `https://api.synopticdata.com/v2/stations/latest?token=${SYNOPTIC_TOKEN}&stid=${stids.join(',')}&vars=wind_speed,wind_direction,wind_gust,air_temp&units=english`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const json = await resp.json();
  const result = {};
  for (const s of (json.STATION || [])) {
    result[s.STID] = {
      name: s.NAME,
      lat: parseFloat(s.LATITUDE),
      lng: parseFloat(s.LONGITUDE),
      elev: parseFloat(s.ELEVATION),
      hasWind: s.OBSERVATIONS?.wind_speed_value_1 != null,
    };
  }
  return result;
}

async function searchSynopticNearby(lat, lng, radiusMi = 15) {
  const url = `https://api.synopticdata.com/v2/stations/latest?token=${SYNOPTIC_TOKEN}&radius=${lat},${lng},${radiusMi}&vars=wind_speed,wind_direction&units=english&limit=10`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
  const json = await resp.json();
  return (json.STATION || []).map(s => ({
    id: s.STID,
    name: s.NAME,
    lat: parseFloat(s.LATITUDE),
    lng: parseFloat(s.LONGITUDE),
    elev: parseFloat(s.ELEVATION),
    wind: s.OBSERVATIONS?.wind_speed_value_1?.value ?? null,
    network: s.MNET_SHORTNAME || 'unknown',
    source: 'synoptic-nearby',
  }));
}

async function searchWuNearby(lat, lng) {
  if (!WU_API_KEY) return [];
  try {
    const url = `https://api.weather.com/v2/pws/observations/all/1day?geocode=${lat},${lng}&format=json&units=e&apiKey=${WU_API_KEY}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return [];
    const json = await resp.json();
    const seen = new Set();
    const results = [];
    for (const obs of (json.observations || [])) {
      if (seen.has(obs.stationID)) continue;
      seen.add(obs.stationID);
      results.push({
        id: obs.stationID,
        name: obs.neighborhood || obs.stationID,
        lat: obs.lat,
        lng: obs.lon,
        elev: obs.imperial?.elev,
        wind: obs.imperial?.windSpeed,
        source: 'wu-pws',
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function main() {
  if (!SYNOPTIC_TOKEN) {
    console.error('SYNOPTIC_TOKEN required. Set it in .env');
    process.exit(1);
  }

  console.log('=== Synoptic Migration — Replacement Station Hunt ===\n');
  console.log(`Paid 10: ${[...PAID_10].join(', ')}`);
  console.log(`Airports (free METAR): ${[...AIRPORTS].join(', ')}`);
  console.log(`Stations to replace: ${DROPPED_STATIONS.length}\n`);

  // Batch-fetch metadata for all dropped stations
  const batches = [];
  for (let i = 0; i < DROPPED_STATIONS.length; i += 20) {
    batches.push(DROPPED_STATIONS.slice(i, i + 20));
  }

  const allMeta = {};
  for (const batch of batches) {
    const meta = await getSynopticMeta(batch);
    Object.assign(allMeta, meta);
    await new Promise(r => setTimeout(r, 500));
  }

  const report = [];

  for (const stid of DROPPED_STATIONS) {
    const meta = allMeta[stid];
    if (!meta) {
      console.log(`\n❌ ${stid}: NOT FOUND in Synoptic (may be offline)`);
      report.push({ stid, status: 'not_found', candidates: [] });
      continue;
    }

    console.log(`\n🔍 ${stid} — ${meta.name} (${meta.lat.toFixed(3)}, ${meta.lng.toFixed(3)}, ${meta.elev}ft, wind=${meta.hasWind})`);

    // Search WU nearby
    const wuNearby = await searchWuNearby(meta.lat, meta.lng);
    await new Promise(r => setTimeout(r, 300));

    const candidates = [];

    for (const wu of wuNearby) {
      const distKm = haversineKm(meta.lat, meta.lng, wu.lat, wu.lng);
      if (distKm <= 15) {
        candidates.push({
          ...wu,
          distKm: Math.round(distKm * 10) / 10,
          elevDelta: wu.elev != null ? Math.round(wu.elev - meta.elev) : null,
        });
      }
    }

    candidates.sort((a, b) => a.distKm - b.distKm);
    const top5 = candidates.slice(0, 5);

    if (top5.length === 0) {
      console.log('  ⚠️  No WU/Tempest replacements found within 15km');
    } else {
      for (const c of top5) {
        const elevStr = c.elevDelta != null ? ` (${c.elevDelta > 0 ? '+' : ''}${c.elevDelta}ft)` : '';
        console.log(`  ✅ ${c.id.padEnd(16)} ${c.distKm}km${elevStr}  wind=${c.wind ?? '?'}mph  [${c.source}] ${c.name}`);
      }
    }

    report.push({
      stid,
      name: meta.name,
      lat: meta.lat,
      lng: meta.lng,
      elev: meta.elev,
      hasWind: meta.hasWind,
      candidates: top5,
    });
  }

  // Summary
  const withCandidates = report.filter(r => r.candidates.length > 0);
  const noCandidates = report.filter(r => r.candidates.length === 0 && r.status !== 'not_found');
  const notFound = report.filter(r => r.status === 'not_found');

  console.log('\n\n=== SUMMARY ===');
  console.log(`✅ Stations with replacement candidates: ${withCandidates.length}`);
  console.log(`⚠️  Stations with NO replacement found:  ${noCandidates.length}`);
  console.log(`❌ Stations not found in Synoptic:       ${notFound.length}`);

  if (noCandidates.length > 0) {
    console.log('\nStations needing manual attention:');
    for (const r of noCandidates) {
      console.log(`  ${r.stid} — ${r.name} (${r.elev}ft)`);
    }
  }

  // Write report JSON
  const fs = await import('fs');
  const outPath = 'scripts/replacement-hunt-results.json';
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`\nFull report written to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
