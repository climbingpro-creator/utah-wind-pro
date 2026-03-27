import React, { Suspense, lazy } from 'react';
import { Wind, Brain, Lightbulb, Waves, Trophy, Calendar, ArrowUpRight, Users } from 'lucide-react';
import { WindVector } from './WindVector';
import { SafeComponent } from '@utahwind/ui';
import DecisionCard from './DecisionCard';
import TodayTimeline from './TodayTimeline';
import ProGate from './ProGate';
import { safeToFixed } from '../utils/safeToFixed';
import { SPOT_SLUG_MAP } from '../config/spotSlugs';

const SpotRanker = lazy(() => import('./SpotRanker'));
const FishingMode = lazy(() => import('./FishingMode'));

export default function FlatwaterTemplate({
  selectedActivity, selectedLake, activityConfig, theme,
  currentWindSpeed, currentWindGust, currentWindDirection,
  effectiveDecision, lakeState, history,
  prediction, effectiveThermalPrediction, effectiveBoatingPrediction,
  effectiveActivityScore, effectiveBriefing, pressureData,
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

  const glassEnd = effectiveBoatingPrediction?.glassWindow?.end || effectiveBoatingPrediction?.glassUntil;
  const now = new Date().getHours();
  const sessionHours = typeof glassEnd === 'number' && glassEnd > now ? glassEnd - now : null;

  const isFishing = selectedActivity === 'fishing';

  return (
    <>
      {/* ═══════ HERO CARD: #1 spot sorted by lowest wind ═══════ */}
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

        {(sessionHours != null || glassEnd) && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
            {sessionHours != null && (
              <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${theme === 'dark' ? 'bg-white/[0.04] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {'🪞'} {sessionHours} hr{sessionHours !== 1 ? 's' : ''} of calm remaining
              </span>
            )}
            {glassEnd && (
              <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg ${theme === 'dark' ? 'bg-white/[0.04] text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                {'🪞'} Calm until ~{typeof glassEnd === 'number' ? (glassEnd > 12 ? `${glassEnd - 12} PM` : `${glassEnd} AM`) : glassEnd}
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
        const act = selectedActivity || 'boating';
        const dayUrl = `/day/${spotSlug}/${today}?activity=${act}`;
        const yearUrl = `/year/${spotSlug}/${new Date().getFullYear()}?activity=${act}`;
        const accent = isFishing ? 'emerald' : 'indigo';
        return (<>
          <button onClick={() => { window.location.href = dayUrl; }} className={`card flex items-center gap-3 hover:border-${accent}-500/40 transition-colors group cursor-pointer w-full text-left`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-${accent}-500/10 border border-${accent}-500/20 group-hover:bg-${accent}-500/20 transition-colors flex-shrink-0`}>
              <Trophy className={`w-5 h-5 text-${accent}-400`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                {isFishing ? 'Fishing' : selectedActivity === 'paddling' ? 'Paddling' : 'Boating'} Day Leaderboard
                <ArrowUpRight className={`w-3.5 h-3.5 text-${accent}-400 opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                {isFishing ? 'Compare catches, biggest fish & time on water' : 'Compare distance, speed & time on water'} at {locName} today
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">Live</span>
            </div>
          </button>
          <button onClick={() => { window.location.href = yearUrl; }} className={`card flex items-center gap-3 hover:border-${accent}-500/30 transition-colors group cursor-pointer w-full text-left`}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-${accent}-500/10 border border-${accent}-500/20 group-hover:bg-${accent}-500/20 transition-colors flex-shrink-0`}>
              <Calendar className={`w-5 h-5 text-${accent}-400`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                {new Date().getFullYear()} Season Leaderboard
                <ArrowUpRight className={`w-3.5 h-3.5 text-${accent}-400 opacity-0 group-hover:opacity-100 transition-opacity`} />
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">Yearly rankings — total time, sessions, top performances</div>
            </div>
          </button>
        </>);
      })()}

      {/* ═══════ FISHING: Bite Score / Pressure / Temp ═══════ */}
      {isFishing && (
        <ProGate feature="Fishing Intelligence" preview="Bite rating, moon phase & more">
          <SafeComponent name="Fishing Mode">
            <FishingMode
              windData={{ stations: lakeState?.wind?.stations, speed: currentWindSpeed }}
              pressureData={pressureData}
              isLoading={isLoading}
              upstreamData={{
                kslcSpeed: lakeState?.kslcStation?.speed, kslcDirection: lakeState?.kslcStation?.direction,
                kpvuSpeed: lakeState?.kpvuStation?.speed, kpvuDirection: lakeState?.kpvuStation?.direction,
              }}
              hourlyForecast={prediction?.hourly}
            />
          </SafeComponent>
        </ProGate>
      )}

      {/* ═══════ SURFACE + PRESSURE CARD ═══════ */}
      <div className="card">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          {isFishing ? <><span>🐟</span> Water &amp; Pressure</> : <><Waves className="w-4 h-4 text-sky-500" /> Surface Conditions</>}
        </h3>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Wind</div>
            <div className={`text-xl font-black ${(currentWindSpeed ?? 0) <= 5 ? 'text-emerald-500' : (currentWindSpeed ?? 0) <= 10 ? 'text-amber-500' : 'text-red-500'}`}>
              {currentWindSpeed != null ? `${safeToFixed(currentWindSpeed, 0)}` : '--'}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">mph</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Pressure</div>
            <div className="text-xl font-black text-[var(--text-primary)]">
              {pressureData?.gradient != null ? safeToFixed(Math.abs(pressureData.gradient), 1) : '--'}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">mb gradient</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">Glass</div>
            <div className={`text-xl font-black ${(effectiveBoatingPrediction?.probability ?? 0) >= 60 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {effectiveBoatingPrediction?.probability ?? '--'}
            </div>
            <div className="text-[10px] text-[var(--text-tertiary)]">{effectiveBoatingPrediction?.waveLabel || 'score'}</div>
          </div>
        </div>
      </div>

      {/* ═══════ WHERE TO GO (inverted: lowest wind wins) ═══════ */}
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
