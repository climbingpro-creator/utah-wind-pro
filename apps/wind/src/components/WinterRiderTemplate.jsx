import React, { Suspense, lazy } from 'react';
import { Wind, Brain, Lightbulb, Mountain, Trophy, Calendar, ArrowUpRight, Users } from 'lucide-react';
import { WindVector } from './WindVector';
import { SafeComponent } from '@utahwind/ui';
import DecisionCard from './DecisionCard';
import TodayTimeline from './TodayTimeline';
import { SPOT_SLUG_MAP } from '../config/spotSlugs';

const SpotRanker = lazy(() => import('./SpotRanker'));
const SnowkiteForecast = lazy(() => import('./SnowkiteForecast'));

export default function WinterRiderTemplate({
  selectedActivity, selectedLake, activityConfig: _activityConfig, theme,
  currentWindSpeed, currentWindGust, currentWindDirection,
  effectiveDecision, lakeState, history,
  prediction, effectiveThermalPrediction, effectiveBoatingPrediction,
  effectiveActivityScore, effectiveBriefing,
  mesoData, isLoading, onSelectSpot, contentRef,
}) {
  const heroStation = lakeState?.wind?.stations?.[0];
  const heroStationId = heroStation?.id || heroStation?.name;
  const heroHistory = heroStationId ? history?.[heroStationId] : null;
  const fallbackHistoryId = !heroHistory?.length && lakeState?.wind?.stations
    ? lakeState.wind.stations.map(s => s.id).find(id => history?.[id]?.length > 0)
    : null;
  const effectiveHistory = heroHistory?.length ? heroHistory : (fallbackHistoryId ? history[fallbackHistoryId] : null);

  const locName = lakeState?.config?.shortName || lakeState?.config?.name || selectedLake;
  const score = effectiveActivityScore?.score;
  const scoreColor = score >= 70 ? 'emerald' : score >= 40 ? 'amber' : 'red';

  const thermalEnd = effectiveThermalPrediction?.endHour;
  const now = new Date().getHours();
  const sessionHours = thermalEnd && thermalEnd > now ? thermalEnd - now : null;
  const expectedPeak = effectiveThermalPrediction?.expectedSpeed || effectiveThermalPrediction?.speed?.expectedAvg;
  const peakHour = effectiveThermalPrediction?.peakHour || effectiveThermalPrediction?.startHour;

  const isSnowSpot = selectedLake?.startsWith('strawberry-') || selectedLake === 'skyline-drive';

  const highElevStations = lakeState?.wind?.stations?.filter(s => {
    const elev = s.elevation ?? 0;
    return elev >= 6000 || s.id?.includes('ridge') || s.id?.includes('peak');
  });
  const sensorStations = highElevStations?.length > 0 ? highElevStations : lakeState?.wind?.stations;

  return (
    <>
      {/* ═══════ HERO CARD: Wind + Snow Base ═══════ */}
      <div className="card space-y-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Mountain className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-[var(--text-primary)] truncate">{locName}</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500">Snowkite</span>
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

        {heroStation && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Wind className="w-3 h-3 text-cyan-400" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Live at {heroStation.name || heroStationId}
              </span>
              <span className={`ml-auto w-2 h-2 rounded-full ${(heroStation.speed ?? heroStation.windSpeed ?? 0) >= 5 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            </div>
            <WindVector station={heroStation} history={effectiveHistory} isPersonalStation={heroStation.isPWS} compact />
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

      {/* ═══════ SESSION DAY LEADERBOARD ═══════ */}
      {(() => {
        const spotSlug = SPOT_SLUG_MAP[selectedLake];
        if (!spotSlug) return null;
        const today = new Date().toISOString().split('T')[0];
        const dayUrl = `/day/${spotSlug}/${today}?activity=snowkiting`;
        const yearUrl = `/year/${spotSlug}/${new Date().getFullYear()}?activity=snowkiting`;
        return (<>
          <button onClick={() => { window.location.href = dayUrl; }} className="card flex items-center gap-3 hover:border-sky-500/40 transition-colors group cursor-pointer w-full text-left">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 group-hover:bg-sky-500/20 transition-colors flex-shrink-0">
              <Trophy className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                Session Day Leaderboard
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Compare jumps &amp; speed with other snowkiters at {locName} today</div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Live</span>
            </div>
          </button>
          <button onClick={() => { window.location.href = yearUrl; }} className="card flex items-center gap-3 hover:border-sky-500/30 transition-colors group cursor-pointer w-full text-left">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 group-hover:bg-sky-500/20 transition-colors flex-shrink-0">
              <Calendar className="w-5 h-5 text-sky-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                {new Date().getFullYear()} Season Leaderboard
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Yearly rankings — total time, sessions, top performances</div>
            </div>
          </button>
        </>);
      })()}

      {/* ═══════ SNOWKITE FORECAST ═══════ */}
      {isSnowSpot && (
        <Suspense fallback={<div className="animate-pulse rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] h-40" />}>
          <SafeComponent name="Snowkite Forecast">
            <SnowkiteForecast selectedLake={selectedLake} mesoData={mesoData} onSelectLocation={onSelectSpot} />
          </SafeComponent>
        </Suspense>
      )}

      {/* ═══════ WHERE TO GO ═══════ */}
      <div ref={contentRef} className="scroll-mt-4">
        <Suspense fallback={<div className="animate-pulse rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] h-48" />}>
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
        </Suspense>
      </div>

      {/* ═══════ HIGH-ELEVATION SENSOR GRID ═══════ */}
      <div aria-live="polite" aria-atomic="false">
        <h2 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Mountain className="w-4 h-4 text-cyan-400" />
          High-Elevation Sensors
          <span className="text-[10px] font-medium text-[var(--text-tertiary)] ml-auto">
            {sensorStations?.filter(s => (s.speed ?? s.windSpeed ?? 0) >= 5).length || 0} firing
          </span>
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {sensorStations?.map((station, index) => (
            <WindVector
              key={station.id || index}
              station={station}
              history={history[station.id]}
              isPersonalStation={station.isPWS}
              compact
            />
          ))}
          {isLoading && !sensorStations?.length && (
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
            <Brain className="w-4 h-4 text-cyan-400" />
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
