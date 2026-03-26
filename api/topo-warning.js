/**
 * POST /api/topo-warning
 *
 * Called every 30s by TopographyLoop.mc on the Garmin watch.
 * Cross-references the rider's lat/lon with known danger zones
 * (dam outflows, shallow reefs, restricted areas) and returns
 * a warning status.
 *
 * Body: { lat, lon, speed, heading, ts }
 */

const DANGER_ZONES = [
  {
    name: 'Deer Creek Dam Outflow',
    lat: 40.4020, lon: -111.5270, radius_m: 300,
    status: 'DANGER', msg: 'DAM OUTFLOW — Stay clear!',
  },
  {
    name: 'Lincoln Beach Marina',
    lat: 40.3005, lon: -111.8870, radius_m: 150,
    status: 'CAUTION', msg: 'Marina traffic zone — reduce speed',
  },
  {
    name: 'Utah Lake Airport Approach',
    lat: 40.2820, lon: -111.7230, radius_m: 500,
    status: 'CAUTION', msg: 'Low aircraft approach zone',
  },
  {
    name: 'Willard Bay Dam',
    lat: 41.3500, lon: -112.0800, radius_m: 400,
    status: 'DANGER', msg: 'DAM — Do not approach',
  },
  {
    name: 'Sand Hollow Reef',
    lat: 37.1050, lon: -113.3950, radius_m: 200,
    status: 'CAUTION', msg: 'Shallow reef — fins at risk',
  },
];

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function checkGeofences(lat, lon) {
  let worst = { status: 'OK', msg: '' };

  for (const zone of DANGER_ZONES) {
    const dist = haversineM(lat, lon, zone.lat, zone.lon);
    if (dist <= zone.radius_m) {
      if (zone.status === 'DANGER') return zone;
      if (worst.status !== 'DANGER') worst = zone;
    }
  }

  return worst;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    let lat, lon;

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      lat = body?.lat;
      lon = body?.lon;
    } else {
      lat = parseFloat(req.query?.lat);
      lon = parseFloat(req.query?.lon);
    }

    if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    const result = checkGeofences(lat, lon);

    return res.status(200).json({
      status: result.status,
      msg: result.msg,
    });
  } catch (err) {
    console.error('[topo-warning]', err.message);
    return res.status(500).json({ status: 'ERROR', msg: err.message });
  }
}
