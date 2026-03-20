import React, { useState, useEffect } from 'react';
import { Rewind, CheckCircle, XCircle, AlertTriangle, TrendingUp, Clock, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { sessionService } from '../services/SessionValidation';
import { safeToFixed } from '../utils/safeToFixed';

/**
 * SESSION REPLAY — "Here's what we predicted vs what actually happened"
 * 
 * Shows accuracy transparently. No other app does this.
 * Builds trust by being honest about when we're right AND wrong.
 */
export default function SessionReplay({ locationId, activity, lakeState: _lakeState }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [expanded, setExpanded] = useState(false);
  const [replayData, setReplayData] = useState(null);

  async function buildReplay() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];

      // Get user session reports for yesterday
      const sessions = await sessionService.getSessionsForDate(dateStr);
      const locSessions = sessions.filter(s =>
        (!locationId || s.locationId === locationId) &&
        (!activity || s.activity === activity)
      );

      // Get prediction accuracy from LearningSystem's IndexedDB
      const predictionAccuracy = await getPredictionAccuracy(dateStr);

      setReplayData({
        date: dateStr,
        dateLabel: 'Yesterday',
        sessions: locSessions,
        accuracy: predictionAccuracy,
        hasData: predictionAccuracy.predictions > 0 || locSessions.length > 0,
      });
    } catch (e) {
      console.warn('SessionReplay error:', e);
    }
  }

  // Build yesterday's replay from stored predictions vs actuals
  useEffect(() => {
    buildReplay();
  }, [locationId, activity]);

  if (!replayData?.hasData) return null;

  const { accuracy, sessions } = replayData;
  const userReports = sessions.length;
  const avgRating = userReports > 0
    ? sessions.reduce((sum, s) => sum + s.rating, 0) / userReports
    : null;

  const accuracyColor = accuracy.score >= 80 ? 'green' : accuracy.score >= 60 ? 'yellow' : 'red';
  const colors = {
    green: { bg: isDark ? 'bg-green-500/10' : 'bg-green-50', text: 'text-green-400', border: isDark ? 'border-green-500/30' : 'border-green-200' },
    yellow: { bg: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50', text: 'text-yellow-400', border: isDark ? 'border-yellow-500/30' : 'border-yellow-200' },
    red: { bg: isDark ? 'bg-red-500/10' : 'bg-red-50', text: 'text-red-400', border: isDark ? 'border-red-500/30' : 'border-red-200' },
  };
  const c = colors[accuracyColor];

  return (
    <div className={`rounded-xl border p-4 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
      >
        <div className="flex items-center gap-2">
          <Rewind className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold">Yesterday's Replay</span>
          {accuracy.score != null && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
              {accuracy.score}% accurate
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Accuracy breakdown */}
          {accuracy.predictions > 0 && (
            <div className="space-y-2">
              <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Prediction Accuracy
              </div>

              <div className="grid grid-cols-3 gap-2">
                <AccuracyStat
                  label="Predictions"
                  value={accuracy.predictions}
                  isDark={isDark}
                  icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />}
                />
                <AccuracyStat
                  label="Correct"
                  value={accuracy.correct}
                  isDark={isDark}
                  icon={<CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                />
                <AccuracyStat
                  label="Missed"
                  value={accuracy.missed}
                  isDark={isDark}
                  icon={<XCircle className="w-3.5 h-3.5 text-red-400" />}
                />
              </div>

              {/* Score bar */}
              <div className={`h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    accuracy.score >= 80 ? 'bg-green-500' : accuracy.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${accuracy.score}%` }}
                />
              </div>

              {/* What we learned */}
              {accuracy.learned && (
                <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <TrendingUp className="w-3 h-3 inline mr-1 text-purple-400" />
                  {accuracy.learned}
                </div>
              )}
            </div>
          )}

          {/* User session reports */}
          {userReports > 0 && (
            <div className="space-y-2">
              <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Community Reports ({userReports})
              </div>

              {sessions.map((s, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
                  <span className="text-sm">
                    {s.windQuality === 'epic' ? '🔥' : s.windQuality === 'good' ? '✅' : s.windQuality === 'ok' ? '〰️' : s.windQuality === 'poor' ? '😕' : '❌'}
                  </span>
                  <div className="flex-1">
                    <span className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      {s.windQuality?.charAt(0).toUpperCase() + s.windQuality?.slice(1)} session
                    </span>
                    {s.startHour != null && s.endHour != null && (
                      <span className={`text-xs ml-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        {formatH(s.startHour)} – {formatH(s.endHour)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n} className={`text-xs ${n <= s.rating ? 'text-yellow-400' : isDark ? 'text-slate-700' : 'text-slate-200'}`}>★</span>
                    ))}
                  </div>
                </div>
              ))}

              {avgRating && (
                <div className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Average rating: {safeToFixed(avgRating, 1)}/5
                </div>
              )}
            </div>
          )}

          {!accuracy.predictions && !userReports && (
            <div className={`text-xs text-center py-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
              No data from yesterday yet. Keep the app open to collect predictions!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AccuracyStat({ label, value, isDark, icon }) {
  return (
    <div className={`flex flex-col items-center p-2 rounded-lg ${isDark ? 'bg-slate-700/40' : 'bg-slate-50'}`}>
      {icon}
      <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>{value}</span>
      <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}

function formatH(h) {
  return h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
}

async function getPredictionAccuracy(dateStr) {
  try {
    const DB_NAME = 'UtahWindProLearning';
    return new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('predictions')) {
          resolve({ predictions: 0, correct: 0, missed: 0, score: null, learned: null });
          return;
        }
        const tx = db.transaction('predictions', 'readonly');
        const store = tx.objectStore('predictions');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const all = getAll.result || [];
          const dayPredictions = all.filter(p => {
            const pDate = p.date || new Date(p.timestamp).toISOString().split('T')[0];
            return pDate === dateStr && p.verified && p.actual != null;
          });

          const predictions = dayPredictions.length;
          let correct = 0;
          let missed = 0;

          for (const p of dayPredictions) {
            const predicted = p.prediction?.expectedSpeed ?? p.predictedSpeed ?? p.probability;
            const actual = p.actual?.avgSpeed ?? p.actual?.speed ?? p.actual?.windSpeed;
            if (predicted == null || actual == null) continue;
            const error = Math.abs(predicted - actual);
            if (error <= 5) correct++;
            else missed++;
          }

          const score = predictions > 0 ? Math.round((correct / predictions) * 100) : null;
          const learned = missed > 3
            ? `Adjusting model — ${missed} predictions were off by >5 mph`
            : correct > 5
              ? `Model performing well — ${correct} of ${predictions} within 5 mph`
              : null;

          resolve({ predictions, correct, missed, score, learned });
        };
        getAll.onerror = () => resolve({ predictions: 0, correct: 0, missed: 0, score: null, learned: null });
      };
      req.onerror = () => resolve({ predictions: 0, correct: 0, missed: 0, score: null, learned: null });
    });
  } catch (_e) {
    return { predictions: 0, correct: 0, missed: 0, score: null, learned: null };
  }
}
