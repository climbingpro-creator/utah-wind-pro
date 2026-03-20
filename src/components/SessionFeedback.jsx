import React, { useState, useEffect, useCallback } from 'react';
import { Star, X, CheckCircle, MapPin, Clock, Send } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { sessionService } from '../services/SessionValidation';
import { generateSmartForecast } from '../services/SmartForecastEngine';

const QUALITY_OPTIONS = [
  { id: 'epic', label: 'Epic', emoji: '🔥', color: 'bg-green-500' },
  { id: 'good', label: 'Good', emoji: '✅', color: 'bg-lime-500' },
  { id: 'ok', label: 'OK', emoji: '〰️', color: 'bg-yellow-500' },
  { id: 'poor', label: 'Poor', emoji: '😕', color: 'bg-orange-500' },
  { id: 'bust', label: 'Bust', emoji: '❌', color: 'bg-red-500' },
];

const HOUR_OPTIONS = [
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
];

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export default function SessionFeedback({ activity, locationId, locationName, forecast, onDismiss }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [step, setStep] = useState('ask'); // ask → rate → details → done
  const [, setDidSession] = useState(null);
  const [quality, setQuality] = useState(null);
  const [rating, setRating] = useState(0);
  const [startHour, setStartHour] = useState(null);
  const [endHour, setEndHour] = useState(null);
  const [estimatedSpeed, setEstimatedSpeed] = useState(null);
  const [, setSubmitted] = useState(false);

  const [smartForecast, setSmartForecast] = useState(forecast);
  const [dismissed, setDismissed] = useState(false);

  // Fetch forecast if not provided
  useEffect(() => {
    if (forecast) { setSmartForecast(forecast); return; }
    let cancelled = false;
    generateSmartForecast(activity, locationId).then(f => {
      if (!cancelled) setSmartForecast(f);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activity, locationId, forecast]);

  const promptWindow = sessionService.shouldPromptForFeedback(smartForecast);

  useEffect(() => {
    const key = `session_feedback_${new Date().toISOString().split('T')[0]}_${locationId}`;
    if (localStorage.getItem(key)) setDismissed(true);
  }, [locationId]);

  const dismiss = useCallback(() => {
    const key = `session_feedback_${new Date().toISOString().split('T')[0]}_${locationId}`;
    localStorage.setItem(key, 'true');
    setDismissed(true);
    onDismiss?.();
  }, [locationId, onDismiss]);

  const submit = useCallback(async () => {
    try {
      await sessionService.recordSession({
        locationId,
        activity,
        rating,
        windQuality: quality,
        startHour,
        endHour,
        estimatedSpeed,
      });
      setSubmitted(true);
      setStep('done');
      setTimeout(dismiss, 3000);
    } catch (e) {
      console.error('Failed to record session:', e);
    }
  }, [locationId, activity, rating, quality, startHour, endHour, dismiss]);

  if (dismissed || !promptWindow) return null;

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`rounded-xl border p-4 ${cardBg} relative`}>
      <button onClick={dismiss} className={`absolute top-3 right-3 ${textSecondary} hover:text-red-400`}>
        <X className="w-4 h-4" />
      </button>

      {step === 'ask' && (
        <div className="space-y-3">
          <div className={`text-sm font-semibold flex items-center gap-2 ${textPrimary}`}>
            <Star className="w-4 h-4 text-yellow-400" />
            How was your session?
          </div>
          <p className={`text-xs ${textSecondary}`}>
            We predicted a {promptWindow.duration}hr window ({promptWindow.start} – {promptWindow.end}).
            Your feedback helps us get better every day.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { setDidSession(true); setStep('rate'); }}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30 transition"
            >
              Yes, I went out!
            </button>
            <button
              onClick={() => { setDidSession(false); dismiss(); }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} transition`}
            >
              Not today
            </button>
          </div>
        </div>
      )}

      {step === 'rate' && (
        <div className="space-y-4">
          <div className={`text-sm font-semibold ${textPrimary}`}>
            How was the wind at {locationName}?
          </div>

          {/* Quality selector */}
          <div className="flex gap-1.5">
            {QUALITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setQuality(opt.id)}
                className={`flex-1 flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg text-xs font-medium transition ${
                  quality === opt.id
                    ? `${opt.color} text-white shadow-lg scale-105`
                    : isDark
                      ? 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Star rating */}
          <div className="flex items-center gap-1">
            <span className={`text-xs mr-2 ${textSecondary}`}>Rate:</span>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setRating(n)}>
                <Star className={`w-5 h-5 transition ${n <= rating ? 'text-yellow-400 fill-yellow-400' : isDark ? 'text-slate-600' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>

          {quality && rating > 0 && (
            <button
              onClick={() => setStep('details')}
              className="w-full py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              Next
            </button>
          )}
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-3">
          <div className={`text-sm font-semibold ${textPrimary}`}>
            When did you ride?
          </div>

          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${textSecondary}`} />
            <div className="flex gap-1.5 flex-wrap">
              {HOUR_OPTIONS.map(h => (
                <button
                  key={`start-${h}`}
                  onClick={() => setStartHour(h)}
                  className={`px-2 py-1 rounded text-xs transition ${
                    startHour === h
                      ? 'bg-blue-500 text-white'
                      : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {formatHour(h)}
                </button>
              ))}
            </div>
          </div>

          {startHour != null && (
            <div className="flex items-center gap-2">
              <span className={`text-xs ${textSecondary}`}>to</span>
              <div className="flex gap-1.5 flex-wrap">
                {HOUR_OPTIONS.filter(h => h > startHour).map(h => (
                  <button
                    key={`end-${h}`}
                    onClick={() => setEndHour(h)}
                    className={`px-2 py-1 rounded text-xs transition ${
                      endHour === h
                        ? 'bg-blue-500 text-white'
                        : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {formatHour(h)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {startHour != null && endHour != null && (
            <>
              <div>
                <div className={`text-xs mb-1.5 ${textSecondary}`}>Estimated wind speed (mph):</div>
                <div className="flex gap-1.5 flex-wrap">
                  {[5, 8, 10, 12, 15, 18, 20, 25].map(s => (
                    <button
                      key={`speed-${s}`}
                      onClick={() => setEstimatedSpeed(s)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                        estimatedSpeed === s
                          ? 'bg-blue-500 text-white'
                          : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={submit}
                className="w-full py-2 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit Feedback
              </button>
            </>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-3 py-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <div>
            <div className={`text-sm font-semibold ${textPrimary}`}>Thanks for the feedback!</div>
            <div className={`text-xs ${textSecondary}`}>This helps our AI get smarter every day.</div>
          </div>
        </div>
      )}
    </div>
  );
}
