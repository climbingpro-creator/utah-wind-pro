const base = 'https://utahwindfinder.com/api/cron/collect';

async function main() {
  const data = await fetch(`${base}?action=sync`).then(r => r.json());
  const records = data?.records || [];

  console.log(`\n=== ${records.length} RECORDS FROM REDIS ===\n`);
  console.log('First record keys:', records.length > 0 ? Object.keys(records[0]) : 'none');
  if (records.length > 0) {
    // Show structure of first record
    const first = records[0];
    console.log('Sample record:', JSON.stringify(first).slice(0, 500));
  }

  // Find records that have utah-lake-zigzag data
  let zigzagRecords = [];
  for (const r of records) {
    // Records might be keyed by timestamp or lake
    const key = r.key || r.timestamp || r.date || '';
    const obs = r.observations || r.obs || r;

    // Look for PWS or utah-lake-zigzag wind data
    if (obs.PWS || obs['utah-lake-zigzag'] || obs.windSpeed !== undefined) {
      zigzagRecords.push({ key, obs });
    }
  }

  console.log(`\nFound ${zigzagRecords.length} records with PWS/zigzag data`);

  // Let's just dump ALL records structure briefly
  for (let i = 0; i < Math.min(records.length, 10); i++) {
    console.log(`\nRecord ${i}:`, JSON.stringify(records[i]).slice(0, 300));
  }
}

main().catch(console.error);
