/**
 * CrossValidationEngine — compares Synoptic and WU PWS readings in real-time,
 * maintains per-station confidence scores, and auto-calibrates speed ratios.
 *
 * Stores cross-validation records in IndexedDB (browser) or a simple in-memory
 * ring buffer (SSR/Node fallback).
 */

const DB_NAME = 'utahwind-crossval';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_CALIBRATION = 'calibration';

const MAX_RECORD_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours
const AGREEMENT_SPEED_THRESHOLD = 2;   // mph
const AGREEMENT_DIR_THRESHOLD   = 30;  // degrees
const MIN_RECORDS_FOR_CONFIDENCE = 6;

export const CROSS_VALIDATION_PAIRS = [
  { synopticId: 'FPS',   wuId: 'KUTLEHI111',  name: 'Flight Park / Lehi' },
  { synopticId: 'UTALP', wuId: 'KUTDRAPE132', name: 'PotM / Draper' },
  { synopticId: 'QLN',   wuId: 'KUTPLEAS11',  name: 'Lindon / Pleasant Grove' },
  { synopticId: 'UTOLY', wuId: 'KUTSARAT50',  name: 'Zigzag / Saratoga' },
  { synopticId: 'UID28', wuId: 'KUTSARAT88',  name: 'Saratoga Springs S' },
  { synopticId: 'UT7',   wuId: 'KUTALPIN3',   name: 'Alpine / AF Canyon' },
];

function directionDelta(a, b) {
  if (a == null || b == null) return null;
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

class CrossValidationEngine {
  constructor() {
    this.db = null;
    this._initPromise = null;
    this._memoryBuffer = [];
    this._calibrationCache = new Map();
  }

  // ── IndexedDB bootstrap ────────────────────────────────────
  async _openDb() {
    if (typeof indexedDB === 'undefined') return null;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          const rs = db.createObjectStore(STORE_RECORDS, { keyPath: 'id', autoIncrement: true });
          rs.createIndex('pairKey', 'pairKey', { unique: false });
          rs.createIndex('timestamp', 'timestamp', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_CALIBRATION)) {
          db.createObjectStore(STORE_CALIBRATION, { keyPath: 'pairKey' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async initialize() {
    if (this.db) return;
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      try {
        this.db = await this._openDb();
      } catch (_e) {
        this.db = null;
      }
      await this._loadCalibrationCache();
    })();
    return this._initPromise;
  }

  async _loadCalibrationCache() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_CALIBRATION, 'readonly');
      const store = tx.objectStore(STORE_CALIBRATION);
      const all = await new Promise((r) => {
        const req = store.getAll();
        req.onsuccess = () => r(req.result);
        req.onerror = () => r([]);
      });
      for (const rec of all) this._calibrationCache.set(rec.pairKey, rec);
    } catch (_e) { /* ok */ }
  }

  // ── Core: compare paired readings ──────────────────────────
  async compare(synopticStations, wuStations) {
    await this.initialize();

    const synMap = new Map();
    for (const s of (synopticStations || [])) {
      if (s.stationId) synMap.set(s.stationId, s);
    }
    const wuMap = new Map();
    for (const w of (wuStations || [])) {
      const id = w.stationId || w.id;
      if (id) wuMap.set(id, w);
    }

    const results = [];
    const now = new Date().toISOString();

    for (const pair of CROSS_VALIDATION_PAIRS) {
      const syn = synMap.get(pair.synopticId);
      const wu  = wuMap.get(pair.wuId);

      const record = {
        pairKey: `${pair.synopticId}:${pair.wuId}`,
        pairName: pair.name,
        timestamp: now,
        synopticId: pair.synopticId,
        wuId: pair.wuId,
        synSpeed: syn?.windSpeed ?? null,
        synGust:  syn?.windGust ?? null,
        synDir:   syn?.windDirection ?? null,
        wuSpeed:  wu?.windSpeed ?? null,
        wuGust:   wu?.windGust ?? null,
        wuDir:    wu?.windDirection ?? null,
        synAvailable: syn?.windSpeed != null,
        wuAvailable:  wu?.windSpeed != null,
      };

      if (record.synAvailable && record.wuAvailable) {
        record.speedDelta = Math.abs(record.synSpeed - record.wuSpeed);
        record.dirDelta = directionDelta(record.synDir, record.wuDir);
        record.speedRatio = record.synSpeed > 0 ? record.wuSpeed / record.synSpeed : null;
        record.agrees = record.speedDelta <= AGREEMENT_SPEED_THRESHOLD
          && (record.dirDelta == null || record.dirDelta <= AGREEMENT_DIR_THRESHOLD);
      } else {
        record.speedDelta = null;
        record.dirDelta = null;
        record.speedRatio = null;
        record.agrees = null;
      }

      await this._storeRecord(record);
      if (record.speedRatio != null) {
        await this._updateCalibration(record);
      }
      results.push(record);
    }

    await this._pruneOldRecords();
    return results;
  }

  async _storeRecord(record) {
    this._memoryBuffer.push(record);
    if (this._memoryBuffer.length > 2000) {
      this._memoryBuffer = this._memoryBuffer.slice(-1000);
    }
    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_RECORDS, 'readwrite');
      tx.objectStore(STORE_RECORDS).add(record);
      await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; });
    } catch (_e) { /* fallback to memory */ }
  }

  async _updateCalibration(record) {
    const key = record.pairKey;
    let cal = this._calibrationCache.get(key) || {
      pairKey: key,
      pairName: record.pairName,
      speedRatios: [],
      agreementCount: 0,
      totalCount: 0,
      rollingSpeedRatio: 1.0,
      lastUpdated: record.timestamp,
    };

    cal.totalCount++;
    if (record.agrees) cal.agreementCount++;
    cal.speedRatios.push(record.speedRatio);
    if (cal.speedRatios.length > 96) cal.speedRatios = cal.speedRatios.slice(-96); // ~24h at 15min
    cal.rollingSpeedRatio = cal.speedRatios.reduce((a, b) => a + b, 0) / cal.speedRatios.length;
    cal.lastUpdated = record.timestamp;

    this._calibrationCache.set(key, cal);

    if (!this.db) return;
    try {
      const tx = this.db.transaction(STORE_CALIBRATION, 'readwrite');
      tx.objectStore(STORE_CALIBRATION).put(cal);
      await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; });
    } catch (_e) { /* ok */ }
  }

  async _pruneOldRecords() {
    if (!this.db) return;
    const cutoff = new Date(Date.now() - MAX_RECORD_AGE_MS).toISOString();
    try {
      const tx = this.db.transaction(STORE_RECORDS, 'readwrite');
      const store = tx.objectStore(STORE_RECORDS);
      const idx = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const cursor = idx.openCursor(range);
      await new Promise((resolve) => {
        cursor.onsuccess = (e) => {
          const c = e.target.result;
          if (c) { c.delete(); c.continue(); } else resolve();
        };
        cursor.onerror = () => resolve();
      });
    } catch (_e) { /* ok */ }
  }

  // ── Confidence scoring ─────────────────────────────────────
  async getStationConfidence(stationId) {
    await this.initialize();

    const pair = CROSS_VALIDATION_PAIRS.find(
      p => p.synopticId === stationId || p.wuId === stationId
    );
    if (!pair) return { confidence: 0.5, reason: 'no-pair', records: 0 };

    const key = `${pair.synopticId}:${pair.wuId}`;
    const cal = this._calibrationCache.get(key);

    if (!cal || cal.totalCount < MIN_RECORDS_FOR_CONFIDENCE) {
      return { confidence: 0.5, reason: 'insufficient-data', records: cal?.totalCount || 0 };
    }

    const agreementRate = cal.agreementCount / cal.totalCount;
    const recency = this._recencyFactor(cal.lastUpdated);
    const ratioStability = this._ratioStability(cal.speedRatios);

    const confidence = Math.min(1, Math.max(0,
      agreementRate * 0.5 + recency * 0.3 + ratioStability * 0.2
    ));

    return {
      confidence: Math.round(confidence * 1000) / 1000,
      agreementRate: Math.round(agreementRate * 1000) / 1000,
      recency,
      ratioStability,
      records: cal.totalCount,
      rollingSpeedRatio: Math.round(cal.rollingSpeedRatio * 1000) / 1000,
      lastUpdated: cal.lastUpdated,
      reason: confidence >= 0.7 ? 'high' : confidence >= 0.4 ? 'medium' : 'low',
    };
  }

  _recencyFactor(lastUpdated) {
    if (!lastUpdated) return 0;
    const ageMs = Date.now() - new Date(lastUpdated).getTime();
    const ageHours = ageMs / (60 * 60 * 1000);
    if (ageHours < 1) return 1;
    if (ageHours < 6) return 0.8;
    if (ageHours < 24) return 0.5;
    return 0.2;
  }

  _ratioStability(ratios) {
    if (!ratios || ratios.length < 3) return 0.5;
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const variance = ratios.reduce((s, r) => s + (r - mean) ** 2, 0) / ratios.length;
    const stddev = Math.sqrt(variance);
    if (stddev < 0.1) return 1;
    if (stddev < 0.3) return 0.7;
    if (stddev < 0.5) return 0.4;
    return 0.2;
  }

  // ── Calibrated speed ratio ─────────────────────────────────
  getCalibratedSpeedRatio(synopticId) {
    const pair = CROSS_VALIDATION_PAIRS.find(p => p.synopticId === synopticId);
    if (!pair) return 1.0;
    const key = `${pair.synopticId}:${pair.wuId}`;
    const cal = this._calibrationCache.get(key);
    if (!cal || cal.totalCount < MIN_RECORDS_FOR_CONFIDENCE) return 1.0;
    return Math.round(cal.rollingSpeedRatio * 1000) / 1000;
  }

  // ── Summary for admin dashboard ────────────────────────────
  async getHealthSummary() {
    await this.initialize();

    const pairs = [];
    for (const pair of CROSS_VALIDATION_PAIRS) {
      const key = `${pair.synopticId}:${pair.wuId}`;
      const cal = this._calibrationCache.get(key);

      const recentRecords = this._memoryBuffer.filter(r => r.pairKey === key).slice(-10);
      const latestRecord = recentRecords[recentRecords.length - 1] || null;

      const conf = await this.getStationConfidence(pair.synopticId);

      pairs.push({
        ...pair,
        confidence: conf.confidence,
        confidenceReason: conf.reason,
        agreementRate: conf.agreementRate ?? null,
        rollingSpeedRatio: cal?.rollingSpeedRatio ?? null,
        totalRecords: cal?.totalCount ?? 0,
        lastUpdated: cal?.lastUpdated ?? null,
        latestSynSpeed: latestRecord?.synSpeed ?? null,
        latestWuSpeed: latestRecord?.wuSpeed ?? null,
        latestSynDir: latestRecord?.synDir ?? null,
        latestWuDir: latestRecord?.wuDir ?? null,
        latestAgrees: latestRecord?.agrees ?? null,
        synOnline: latestRecord?.synAvailable ?? false,
        wuOnline: latestRecord?.wuAvailable ?? false,
      });
    }

    const onlinePairs = pairs.filter(p => p.synOnline && p.wuOnline);
    const overallConfidence = pairs.length > 0
      ? pairs.reduce((s, p) => s + p.confidence, 0) / pairs.length
      : 0;

    return {
      pairs,
      overallConfidence: Math.round(overallConfidence * 1000) / 1000,
      crossValidatedCount: onlinePairs.filter(p => p.latestAgrees).length,
      totalPairs: pairs.length,
      bothOnlineCount: onlinePairs.length,
    };
  }

  async reset() {
    this._memoryBuffer = [];
    this._calibrationCache.clear();
    if (!this.db) return;
    try {
      for (const storeName of [STORE_RECORDS, STORE_CALIBRATION]) {
        const tx = this.db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; });
      }
    } catch (_e) { /* ok */ }
  }
}

export const crossValidationEngine = new CrossValidationEngine();
export default CrossValidationEngine;
