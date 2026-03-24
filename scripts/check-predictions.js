const BASE = 'https://utahwindfinder.com/api/cron/collect';

async function main() {
  const r = await fetch(`${BASE}?action=predictions`);
  const d = await r.json();

  console.log('Total predictions:', d.count);
  console.log('Lakes:', d.lakes);

  const probs = (d.predictions || []).map(p => p.probability);
  const buckets = { 'high (>=70)': 0, 'medium (40-69)': 0, 'low (15-39)': 0, 'minimal (<15)': 0 };
  for (const p of probs) {
    if (p >= 70) buckets['high (>=70)']++;
    else if (p >= 40) buckets['medium (40-69)']++;
    else if (p >= 15) buckets['low (15-39)']++;
    else buckets['minimal (<15)']++;
  }
  console.log('\nProbability spread:');
  for (const [k, v] of Object.entries(buckets)) {
    const bar = '█'.repeat(Math.round(v / Math.max(1, probs.length) * 40));
    console.log(`  ${k.padEnd(18)} ${String(v).padStart(4)} ${bar}`);
  }

  const types = {};
  for (const p of (d.predictions || [])) {
    types[p.eventType] = (types[p.eventType] || 0) + 1;
  }
  console.log('\nBy event type:', types);

  const latest = (d.predictions || [])[0];
  if (latest) {
    console.log('\nLatest timestamp:', latest.timestamp);
    console.log('Sample:', latest.eventType, `${latest.probability}%`, latest.lakeId);
  }

  // Check top 5 by probability
  console.log('\nTop 5 predictions:');
  for (const p of (d.predictions || []).slice(0, 5)) {
    console.log(`  ${p.lakeId.padEnd(25)} ${p.eventType.padEnd(20)} ${p.probability}%`);
  }
  console.log('\nBottom 5 predictions:');
  for (const p of (d.predictions || []).slice(-5)) {
    console.log(`  ${p.lakeId.padEnd(25)} ${p.eventType.padEnd(20)} ${p.probability}%`);
  }
}

main();
