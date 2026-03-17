const fs = require('fs');
const files = ['strawberry_stations.json', 'skyline_stations.json', 'daniels_stations.json'];

for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(f, 'utf8'));
    console.log(`\n=== ${f} ===`);
    console.log(`Status: ${d.SUMMARY?.RESPONSE_MESSAGE} | Count: ${d.SUMMARY?.NUMBER_OF_OBJECTS}`);
    if (d.STATION) {
      d.STATION.forEach(s => {
        console.log(`  ${s.STID} | ${s.NAME} | ${s.LATITUDE},${s.LONGITUDE} | ${s.ELEVATION}ft | ${s.MNET_SHORTNAME || s.MNET_ID} | dist:${s.DISTANCE || '?'}mi`);
      });
    }
  } catch (e) {
    console.log(`Error reading ${f}: ${e.message}`);
  }
}
