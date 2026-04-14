import { redisCommand, redisMGet, hasRedis } from './lib/redis.js';
import { runServerLearningCycle } from './lib/serverLearning.js';
import { LAKE_STATION_MAP } from './lib/stations.js';

export const config = { maxDuration: 120 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!hasRedis()) return res.status(200).json({ error: 'no redis' });

  const mode = req.query?.mode || 'check';

  try {
    const [metaRaw, weightsRaw, predIndex] = await Promise.all([
      redisCommand('GET', 'learning:meta'),
      redisCommand('GET', 'weights:server'),
      redisCommand('LRANGE', 'pred:index', '0', '3'),
    ]);

    const meta = metaRaw ? JSON.parse(metaRaw) : null;
    const hasWeights = !!weightsRaw;

    let latestPred = null;
    if (Array.isArray(predIndex) && predIndex.length > 0) {
      const raw = await redisCommand('GET', predIndex[0]);
      if (raw) {
        const p = JSON.parse(raw);
        latestPred = { key: predIndex[0], ts: p.timestamp, count: p.predictions?.length };
      }
    }

    if (mode !== 'run') {
      return res.status(200).json({ meta, hasWeights, predKeys: predIndex, latestPred });
    }

    // Mode=run: actually execute the learning cycle and report
    const obsKeys = await redisCommand('LRANGE', 'obs:index', '0', '0');
    if (!obsKeys?.length) return res.status(200).json({ error: 'no obs in redis' });

    const latestRaw = await redisCommand('GET', obsKeys[0]);
    if (!latestRaw) return res.status(200).json({ error: 'obs key empty' });

    const latest = JSON.parse(latestRaw);
    const stations = latest.stations || [];

    const recentKeys = await redisCommand('LRANGE', 'obs:index', '0', '15');
    const recentSnapshots = [];
    if (recentKeys?.length > 1) {
      const values = await redisMGet(recentKeys.slice(1, 16));
      for (const raw of values) {
        if (raw) try { recentSnapshots.push(JSON.parse(raw)); } catch {}
      }
    }
    recentSnapshots.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let nwsData = null;
    try {
      const nwsRaw = await redisCommand('GET', 'nws:forecasts');
      if (nwsRaw) nwsData = JSON.parse(nwsRaw);
    } catch {}

    const result = await runServerLearningCycle(
      redisCommand, stations, recentSnapshots, LAKE_STATION_MAP, nwsData
    );

    return res.status(200).json({
      ok: true,
      stationCount: stations.length,
      snapshotCount: recentSnapshots.length,
      result,
    });
  } catch (e) {
    return res.status(500).json({
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 8),
    });
  }
}
