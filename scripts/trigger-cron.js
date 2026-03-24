import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* no .env */ }
}

loadEnv();

const BASE = 'https://utahwindfinder.com/api/cron/collect';
const secret = process.env.CRON_SECRET;

async function main() {
  console.log('Triggering cron cycle...');
  console.log(`CRON_SECRET: ${secret ? secret.slice(0, 8) + '...' : 'NOT SET'}`);

  const headers = {};
  if (secret) headers['Authorization'] = `Bearer ${secret}`;

  try {
    const resp = await fetch(BASE, {
      headers,
      signal: AbortSignal.timeout(120000),
    });
    const text = await resp.text();

    if (!resp.ok) {
      console.log(`HTTP ${resp.status}: ${text.slice(0, 500)}`);
      return;
    }

    const data = JSON.parse(text);
    console.log('\nCron cycle result:');
    console.log(`  Stations collected: ${data.stationsCollected}`);
    console.log(`  Stations with wind: ${data.stationsWithWind}`);
    console.log(`  Stations with pressure: ${data.stationsWithPressure}`);
    console.log(`  Pressure gradient: ${JSON.stringify(data.pressureCheck)}`);
    console.log(`  NWS: ${JSON.stringify(data.nws)}`);
    console.log(`  Propagation: ${JSON.stringify(data.propagation)}`);

    if (data.learning) {
      const l = data.learning;
      console.log('\n  Learning:');
      console.log(`    Predictions made: ${l.predictionsCount || l.predictions || 'n/a'}`);
      console.log(`    Verified: ${l.verificationsCount || l.verifications || 'n/a'}`);
      console.log(`    Weights updated: ${l.weightsUpdated ?? 'n/a'}`);
      console.log(`    Cycle: ${l.cycle || 'n/a'}`);
      console.log(`    Full: ${JSON.stringify(l).slice(0, 500)}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
