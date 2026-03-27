import React, { Suspense, lazy } from 'react';
import { Wind, Brain, Lightbulb, ShieldCheck, ShieldAlert, AlertTriangle, AlertCircle, XCircle, CheckCircle, Trophy, Users, ArrowUpRight } from 'lucide-react';
import { WindVector } from './WindVector';
import { SafeComponent } from './ErrorBoundary';
import DecisionCard from './DecisionCard';
import TodayTimeline from './TodayTimeline';
import { evaluateKiteSafety } from './KiteSafety';

const SpotRanker = lazy(() => import('./SpotRanker'));

const SPOT_SLUG_MAP = {
  'utah-lake-lincoln': 'lincoln-beach',
  'utah-lake-sandy': 'sandy-beach',
  'utah-lake-vineyard': 'vineyard',
  'utah-lake-zigzag': 'zig-zag',
  'utah-lake-mm19': 'american-fork',
  'utah-lake': 'lincoln-beach',
  'deer-creek': 'deer-creek',
  'willard-bay': 'willard-bay',
  'yuba': 'yuba',
  'sand-hollow': 'sand-hollow',
};

const SAFETY_PILL = {
  GO:      { bg: 'bg-green-500/15',  border: 'border-green-500/40', text: 'text-green-400',  icon: ShieldCheck },
  FOIL:    { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/40',  text: 'text-cyan-400',   icon: CheckCircle },
  WAIT:    { bg: 'bg-yellow-500/15', border: 'border-yellow-500/40',text: 'text-yellow-400', icon: AlertCircle },
  CAUTION: { bg: 'bg-orange-500/15', border: 'border-orange-500/40',text: 'text-orange-400', icon: AlertTriangle },
  STOP:    { bg: 'bg-red-500/15',    border: 'border-red-500/40',   text: 'text-red-400',    icon: XCircle },
  DANGER:  { bg: 'bg-red-500/20',    border: 'border-red-500/50',   text: 'text-red-400',    icon: ShieldAlert },
};

function SafetyPill({ label, assessment }) {
  const s = SAFETY_PILL[assessment.status] || SAFETY_PILL.WAIT;
  const Icon = s.icon;
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border ${s.bg} ${s.border}`}>
      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${s.text}`} />
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
      <span className={`text-xs font-extrabold ${s.text}`}>{assessment.status}</span>
      {assessment.reason && <span className={`text-[11px] ml-auto ${s.text} opacity-80`}>{assessment.reason}</span>}
    </div>
  );
}

export default function WindSeekerTemplate({
  selectedActivity, selectedLake, activityConfig, theme,
  currentWindSpeed, currentWindGust, currentWindDirection,
  effectiveDecision, lakeState, history,
  prediction, effectiveThermalPrediction, effectiveBoatingPrediction,
  effectiveActivityScore, effectiveBriefing, pressureData: _pressureData,
  mesoData, isLoading, onSelectSpot, contentRef,
}) {
  const pwsFromStations = lakeState?.wind?.stations?.find(s => s.isPWS || s.isYourStation);
  const heroStation = pwsFromStations || lakeState?.wind?.stations?.[0];
  const heroStationId = heroStation?.id || heroStation?.name;
  const heroHistory = heroStationId ? history?.[heroStationId] : null;
  const fallbackHistoryId = !heroHistory?.length && lakeState?.wind?.stations
    ? lakeState.wind.stations.map(s => s.id).find(id => history?.[id]?.length > 0)
    : null;
  const effectiveHistory = heroHistory?.length ? heroHistory : (fallbackHistoryId ? history[fallbackHistoryId] : null);
  const historySourceName = fallbackHistoryId && !heroHistory?.length
    ? lakeState?.wind?.stations?.find(s => s.id === fallbackHistoryId)?.name
    : null;

  const locName = lakeState?.config?.shortName || lakeState?.config?.name || selectedLake;
  const score = effectiveActivityScore?.score;
  const scoreColor = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';

  const thermalEnd = effectiveThermalPrediction?.endHour;
  const now = new Date().getHours();
  const sessionHours = thermalEnd && thermalEnd > now ? thermalEnd - now : null;
  const expectedPeak = effectiveThermalPrediction?.expectedSpeed || effectiveThermalPrediction?.speed?.expectedAvg;
  const peakHour = effectiveThermalPrediction?.peakHour || effectiveThermalPrediction?.startHour;

  const safeArc = lakeState?.config?.safeWindArc ?? null;
  const safetyResult = evaluateKiteSafety(
    currentWindSpeed ?? 0,
    currentWindGust ?? currentWindSpeed ?? 0,
    currentWindDirection,
    safeArc
  );

  return (
    <>
      {/* ═══════ HERO CARD: #1 spot with dual safety pills ═══════ */}
      <div className="card space-y-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-[var(--text-primary)] truncate">{locName}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-500">{activityConfig?.name}</span>
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              {effectiveDecision.windSpeed != null ? `${Math.round(effectiveDecision.windSpeed)} mph` : '--'}
              {effectiveDecision.windDirection != null && (() => {
                const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
                return ` ${dirs[Math.round(effectiveDecision.windDirection / 22.5) % 16]}`;
              })()}
              {effectiveDecision.windGust > effectiveDecision.windSpeed * 1.2 && ` G${Math.round(effectiveDecision.windGust)}`}
            </div>
          </div>
          {score != null && (
            <div className="text-right flex-shrink-0">
              <div className={`text-3xl font-black tabular-nums text-${scoreColor}-500`}>{score}</div>
              <div className="text-[9px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">score</div>
            </div>
          )}
        </div>

        <DecisionCard
          activity={selectedActivity}
          windSpeed={effectiveDecision.windSpeed}
          windGust={effectiveDecision.windGust}
          windDirection={effectiveDecision.windDirection}
          thermalPrediction={effectiveThermalPrediction}
          boatingPrediction={effectiveBoatingPrediction}
          briefing={effectiveBriefing}
          locationName={locName}
          unifiedDecision={prediction ? { decision: prediction.decision, confidence: prediction.confidence, headline: prediction.briefing?.headline, detail: prediction.briefing?.body, action: prediction.briefing?.bestAction } : null}
        />

        {/* Dual Safety Pills: Beginner & Expert */}
        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
          <SafetyPill label="Beginner" assessment={safetyResult.beginner} />
          <SafetyPill label="Expert" assessment={safetyResult.expert} />
        </div>

        {heroStation && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Wind className="w-3 h-3 text-sky-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Live at {heroStation.name || heroStationId}
              </span>
              {(heroStation.speed ?? heroStation.windSpeed) == null && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${theme === 'dark' ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>Offline</span>
              )}
              <span className={`ml-auto w-2 h-2 rounded-full ${(heroStation.speed ?? heroStation.windSpeed ?? 0) >= 5 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            </div>
            <WindVector station={heroStation} history={effectiveHistory} isPersonalStation={heroStation.isPWS} compact />
            {historySourceName && (
              <div className={`text-[9px] mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Trend from {historySourceName}
              </div>
            )}
          </div>
        )}

        {(sessionHours != null || expectedPeak) && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
            {sessionHours != null && (
              <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${theme === 'dark' ? 'bg-white/[0.04] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {'⏱️'} {sessionHours} hr{sessionHours !== 1 ? 's' : ''} remaining
              </span>
            )}
            {expectedPeak != null && peakHour != null && (
              <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${theme === 'dark' ? 'bg-white/[0.04] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {'💨'} Peak ~{Math.round(expectedPeak)} mph at {peakHour > 12 ? `${peakHour - 12} PM` : `${peakHour} AM`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══════ SESSION DAY LEADERBOARD LINK ═══════ */}
      {(() => {
        const spotSlug = SPOT_SLUG_MAP[selectedLake];
        if (!spotSlug) return null;
        const today = new Date().toISOString().split('T')[0];
        const dayUrl = `/day/${spotSlug}/${today}`;
        return (
          <a
            href={dayUrl}
            className="card flex items-center gap-3 no-underline hover:border-amber-500/40 transition-colors group cursor-pointer"
            style={{ textDecoration: 'none' }}
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors flex-shrink-0">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                Session Day Leaderboard
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                Compare jumps, speed &amp; hangtime with other riders at {locName} today
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Live</span>
            </div>
          </a>
        );
      })()}

      {/* ═══════ WHERE TO GO ═══════ */}
      <div ref={contentRef} className="scroll-mt-4">
        <SafeComponent name="Spot Ranker">
          <SpotRanker
            activity={selectedActivity}
            currentWind={{ speed: currentWindSpeed, gust: currentWindGust, direction: currentWindDirection }}
            lakeState={lakeState}
            mesoData={mesoData}
            thermalPrediction={effectiveThermalPrediction}
            onSelectSpot={onSelectSpot}
          />
        </SafeComponent>
      </div>

      {/* ═══════ LIVE SENSOR NETWORK ═══════ */}
      <div aria-live="polite" aria-atomic="false">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Wind className="w-4 h-4 text-sky-500" />
          Live Sensor Network
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] ml-auto">
            {lakeState?.wind?.stations?.filter(s => (s.speed ?? s.windSpeed ?? 0) >= 5).length || 0} firing
          </span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {lakeState?.wind?.stations?.map((station, index) => (
            <WindVector
              key={station.id || index}
              station={station}
              history={history[station.id]}
              isPersonalStation={station.isPWS}
              compact
            />
          ))}
          {isLoading && !lakeState?.wind?.stations?.length && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className={`rounded-lg p-3 animate-pulse ${theme === 'dark' ? 'bg-slate-800/40 border border-slate-700/50' : 'bg-white border border-slate-200'}`}>
                  <div className="h-4 bg-[var(--border-color)] rounded w-2/3 mb-3" />
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-[var(--border-color)] rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-[var(--border-color)] rounded w-1/2" />
                      <div className="h-3 bg-[var(--border-color)] rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ═══════ HOURLY FORECAST ═══════ */}
      <SafeComponent name="Today Timeline">
        <TodayTimeline locationId={selectedLake} activity={selectedActivity} unifiedHourly={prediction?.hourly} />
      </SafeComponent>

      {/* ═══════ AI BRIEFING ═══════ */}
      {effectiveBriefing && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-sky-500" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">{effectiveBriefing.headline}</span>
            {effectiveBriefing.excitement >= 4 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                {effectiveBriefing.excitement >= 5 ? 'EPIC' : 'HOT'}
              </span>
            )}
          </div>
          {effectiveBriefing.body && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{effectiveBriefing.body}</p>
          )}
          <div className="space-y-1.5">
            {effectiveBriefing.bullets?.slice(0, 3).map((b, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[var(--text-tertiary)]">
                <span className="flex-shrink-0">{b.icon || '·'}</span>
                <span>{typeof b === 'string' ? b : b.text}</span>
              </div>
            ))}
          </div>
          {effectiveBriefing.bestAction && (
            <div className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 bg-sky-500/[0.06] text-sky-500 border border-sky-500/20">
              <Lightbulb className="w-4 h-4 shrink-0" /> {effectiveBriefing.bestAction}
            </div>
          )}
        </div>
      )}
    </>
  );
}
