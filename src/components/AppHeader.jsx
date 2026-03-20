import { Bell, Brain, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function AppHeader({
  theme,
  activityConfig,
  error,
  formatTime,
  lastUpdated,
  isLoading,
  isPro,
  trialActive,
  trialDaysLeft,
  showLearningDashboard,
  lakeState,
  getSMSPrefs,
  onSMSClick,
  onPhotoClick,
  onNotificationsClick,
  onLearningClick,
  onRefresh,
  onUpgradeClick,
}) {
  const btnBase = `flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition-colors`;
  const btnColors = theme === 'dark'
    ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600';

  return (
    <header className={`border-b sticky top-0 z-40 transition-colors duration-200 ${
      theme === 'dark' 
        ? 'border-slate-800 bg-slate-950/95 backdrop-blur-md' 
        : 'border-slate-200 bg-white/95 backdrop-blur-md'
    }`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-extrabold tracking-tight text-sky-500">
              UtahWindFinder
            </h1>
            <span className={`hidden sm:inline text-[11px] font-medium px-2 py-0.5 rounded-full ${
              theme === 'dark' ? 'bg-sky-500/10 text-sky-400' : 'bg-sky-50 text-sky-600'
            }`}>
              {activityConfig?.description || 'AI Forecasting'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className={`hidden sm:flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg ${
              theme === 'dark' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
            }`}>
              {error ? (
                <WifiOff className="w-3.5 h-3.5 text-red-500" />
              ) : (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              )}
              <span>{formatTime(lastUpdated)}</span>
            </div>

            <button onClick={onSMSClick} aria-label="Text Alerts" className={`${btnBase} relative ${btnColors}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="text-[8px] leading-none font-medium">SMS</span>
              {getSMSPrefs().enabled && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            <button onClick={onPhotoClick} aria-label="Submit Photo" className={`${btnBase} ${btnColors}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span className="text-[8px] leading-none font-medium">Photo</span>
            </button>

            <button onClick={onNotificationsClick} aria-label="Notifications" className={`${btnBase} ${btnColors}`}>
              <Bell className="w-4 h-4" />
              <span className="text-[8px] leading-none font-medium">Alerts</span>
            </button>

            <button
              onClick={onLearningClick}
              aria-label="Learning System"
              aria-expanded={showLearningDashboard}
              className={`${btnBase} relative ${
                showLearningDashboard 
                  ? 'bg-sky-500 text-white' 
                  : (theme === 'dark' 
                    ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-sky-400' 
                    : 'hover:bg-slate-100 text-slate-400 hover:text-sky-600')
              }`}
            >
              <Brain className="w-4 h-4" />
              <span className="text-[8px] leading-none font-medium">Learn</span>
              {lakeState?.thermalPrediction?.isUsingLearnedWeights && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh data"
              className={`${btnBase} disabled:opacity-40 ${btnColors}`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="text-[8px] leading-none font-medium">Refresh</span>
            </button>

            <ThemeToggle />

            {!isPro && (
              <button
                onClick={onUpgradeClick}
                className="ml-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm hover:shadow-lg hover:shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
              >
                Upgrade
              </button>
            )}
            {isPro && trialActive && (
              <span className="ml-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Trial: {trialDaysLeft}d
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
