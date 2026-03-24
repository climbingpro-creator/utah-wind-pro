const BASE = 'https://utahwindfinder.com/api/cron/collect';

async function main() {
  // Test 1: No auth, no action (main cron path)
  console.log('Test 1: No auth, no action (simulating cron without CRON_SECRET)');
  let r = await fetch(BASE);
  console.log(`  Status: ${r.status}`);
  let t = await r.text();
  console.log(`  Body: ${t.slice(0, 200)}`);

  // Test 2: No auth, read action (should work)
  console.log('\nTest 2: No auth, action=sync (read-only)');
  r = await fetch(`${BASE}?action=sync`);
  console.log(`  Status: ${r.status}`);
  t = await r.text();
  console.log(`  Body: ${t.slice(0, 200)}`);

  // Test 3: Check recent observations
  console.log('\nTest 3: Check obs:index for recent data');
  r = await fetch(`${BASE}?action=sync`);
  const data = await r.json();
  console.log(`  Records: ${data.count || data.records?.length || 0}`);
  if (data.records?.length > 0) {
    console.log(`  Latest: ${data.records[0]?.timestamp}`);
    console.log(`  Oldest: ${data.records[data.records.length - 1]?.timestamp}`);
  }

  // Test 4: Check learning meta
  console.log('\nTest 4: Check weights/meta for last cycle');
  r = await fetch(`${BASE}?action=weights`);
  const w = await r.json();
  if (w.meta) {
    console.log(`  Total cycles: ${w.meta.totalCycles}`);
    console.log(`  Last cycle: ${w.meta.lastCycle}`);
    console.log(`  Last prediction count: ${w.meta.lastPredictionCount}`);
    console.log(`  Last verification count: ${w.meta.lastVerificationCount}`);
  }
}

main();
