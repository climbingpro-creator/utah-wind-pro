#!/usr/bin/env node
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const lines = readFileSync(resolve(__dirname, '..', '.env'), 'utf-8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 0) continue;
    if (!process.env[t.slice(0, eq).trim()]) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
} catch {}

const apiKey = process.env.AMBIENT_API_KEY || process.env.VITE_AMBIENT_API_KEY;
const appKey = process.env.AMBIENT_APP_KEY || process.env.VITE_AMBIENT_APP_KEY;
const mac = process.env.AMBIENT_DEVICE_MAC || '48:3F:DA:54:2C:6E';

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('=== PWS DEVICE STATUS ===');
  const devUrl = `https://rt.ambientweather.net/v1/devices?apiKey=${apiKey}&applicationKey=${appKey}`;
  const devResp = await fetch(devUrl);
  const devices = await devResp.json();
  const dev = devices.find(d => d.macAddress === mac) || devices[0];
  if (!dev) { console.log('No device found!'); return; }
  console.log('Device:', dev.info?.name || 'unnamed');
  console.log('MAC:', dev.macAddress);
  const last = dev.lastData;
  if (last) {
    const ts = new Date(last.dateutc || last.date);
    console.log('Last reading:', ts.toISOString());
    console.log('  Age:', Math.round((Date.now() - ts.getTime()) / 60000), 'minutes ago');
    console.log('  Wind:', last.windspeedmph ?? last.windSpeed ?? '?', 'mph');
    console.log('  Dir:', last.winddir ?? last.windDir ?? '?', '°');
    console.log('  Gust:', last.windgustmph ?? last.windGust ?? '?', 'mph');
    console.log('  Temp:', last.tempf ?? last.temp ?? '?', '°F');
    const online = (Date.now() - ts.getTime()) < 30 * 60 * 1000;
    console.log('  Status:', online ? '✓ ONLINE' : '⚠ OFFLINE (last reading > 30 min ago)');
  } else {
    console.log('No lastData — device appears offline');
  }
  console.log('');

  console.log('=== DATE RANGE PROBE ===');
  await sleep(1200);
  const recentUrl = `https://api.ambientweather.net/v1/devices/${encodeURIComponent(mac)}?apiKey=${apiKey}&applicationKey=${appKey}&limit=1`;
  const recentResp = await fetch(recentUrl);
  const recentData = await recentResp.json();
  if (Array.isArray(recentData) && recentData.length > 0) {
    console.log('Newest in API:', new Date(recentData[0].dateutc || recentData[0].date).toISOString());
  }

  const probes = [
    '2023-04-01', '2023-07-01', '2023-10-01',
    '2024-01-01', '2024-04-01', '2024-07-01', '2024-10-01',
    '2025-01-01', '2025-04-01', '2025-07-01', '2025-08-01',
    '2025-08-15', '2025-09-01', '2025-09-15', '2025-10-01',
    '2025-10-15', '2025-11-01', '2025-12-01',
    '2026-01-01', '2026-02-01', '2026-03-01',
  ];

  console.log('');
  console.log('Probing for data at specific dates (oldest reading on or before date):');
  for (const d of probes) {
    await sleep(1200);
    const endDate = new Date(d + 'T23:59:59Z').toISOString();
    const url = `https://api.ambientweather.net/v1/devices/${encodeURIComponent(mac)}?apiKey=${apiKey}&applicationKey=${appKey}&limit=1&endDate=${endDate}`;
    try {
      const resp = await fetch(url);
      if (resp.status === 429) {
        console.log(`  ${d}: rate limited — retrying…`);
        await sleep(2500);
        continue;
      }
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const ts = new Date(data[0].dateutc || data[0].date);
        console.log(`  ${d}: ✓ data — reading at ${ts.toISOString().slice(0, 16)}`);
      } else {
        console.log(`  ${d}: ✗ NO DATA`);
      }
    } catch (e) {
      console.log(`  ${d}: ERROR ${e.message}`);
    }
  }
}

run().catch(e => console.error(e));
