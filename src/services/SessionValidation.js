/**
 * SESSION VALIDATION SERVICE
 * 
 * Crowd-sourced ground truth that no weather station can provide.
 * 
 * After a predicted session window, users get a simple prompt:
 *   "Did you ride today? How was it?"
 * 
 * This data is GOLD for the learning system:
 *   - 5 kiters say "great session at Zig Zag 2-5 PM" → validates our prediction
 *   - 3 boaters say "glass at Sandy Beach until noon" → confirms our glass forecast
 *   - User says "went to Deer Creek, wind died at 3" → learning system adjusts
 * 
 * Data flows:
 *   User feedback → IndexedDB → LearningSystem weight recalibration
 */

const DB_NAME = 'UtahWindProSessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

class SessionValidationService {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date');
          store.createIndex('location', 'locationId');
          store.createIndex('activity', 'activity');
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Record a user session report
   * @param {object} report
   * @param {string} report.locationId - e.g. 'utah-lake-zigzag'
   * @param {string} report.activity - e.g. 'kiting'
   * @param {number} report.rating - 1-5 stars
   * @param {string} report.windQuality - 'epic' | 'good' | 'ok' | 'poor' | 'bust'
   * @param {number} report.startHour - approximate start time
   * @param {number} report.endHour - approximate end time
   * @param {number} report.estimatedSpeed - user's estimate of avg wind
   * @param {string} [report.notes] - optional free text
   */
  async recordSession(report) {
    await this.init();
    const session = {
      ...report,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      deviceId: this._getDeviceId(),
    };

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(session);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all sessions for a date (for session replay)
   */
  async getSessionsForDate(dateStr) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const idx = store.index('date');
      const req = idx.getAll(dateStr);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get session stats for learning system integration
   */
  async getValidationStats(locationId, daysBack = 30) {
    await this.init();
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const all = req.result.filter(s =>
          s.timestamp >= cutoff && (!locationId || s.locationId === locationId)
        );
        const total = all.length;
        const avgRating = total > 0 ? all.reduce((sum, s) => sum + s.rating, 0) / total : 0;
        const epicCount = all.filter(s => s.windQuality === 'epic').length;
        const bustCount = all.filter(s => s.windQuality === 'bust').length;
        const byLocation = {};
        for (const s of all) {
          if (!byLocation[s.locationId]) byLocation[s.locationId] = [];
          byLocation[s.locationId].push(s);
        }
        resolve({ total, avgRating, epicCount, bustCount, byLocation, sessions: all });
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Check if we should prompt the user for a session report.
   * Returns the predicted window if one ended recently.
   */
  shouldPromptForFeedback(forecast) {
    if (!forecast?.windows?.length) return null;
    const now = new Date();
    const currentHour = now.getHours();

    for (const window of forecast.windows) {
      const windowEnd = window.endHour;
      const hoursSinceEnd = (currentHour - windowEnd + 24) % 24;
      if (hoursSinceEnd >= 1 && hoursSinceEnd <= 3 && window.isToday) {
        return window;
      }
    }
    return null;
  }

  _getDeviceId() {
    let id = localStorage.getItem('uwp_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('uwp_device_id', id);
    }
    return id;
  }
}

export const sessionService = new SessionValidationService();
