import { redisCommand, hasRedis } from './lib/redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!hasRedis()) return res.status(200).json({ error: 'no redis' });

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

    return res.status(200).json({
      meta,
      hasWeights,
      predKeys: predIndex,
      latestPred,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack?.split('\n').slice(0, 3) });
  }
}
