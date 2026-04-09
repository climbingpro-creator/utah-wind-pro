import { useState } from 'react';
import { Bell, Brain, RefreshCw, Wifi, WifiOff, Trophy, LogIn, LogOut, Shield, Crown } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { SPOT_SLUG_MAP } from '../config/spotSlugs';

const ADMIN_EMAILS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];

export default function AppHeader({
  theme,
  activityConfig,
  error,
  formatTime,
  lastUpdated,
  isLoading,
  isPro,
  rawTier,
  trialActive,
  trialDaysLeft,
  showLearningDashboard,
  lakeState,
  selectedLake,
  selectedActivity,
  getSMSPrefs,
  onSMSClick,
  onGarminClick,
  onPhotoClick,
  onNotificationsClick,
  onLearningClick,
  onRefresh,
  onUpgradeClick,
}) {
  const { user, signOut, manageSubscription } = useAuth();
  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      await manageSubscription();
    } catch (err) {
      console.error('Failed to open subscription portal:', err);
    } finally {
      setManagingSubscription(false);
    }
  };
  const isAdmin = user && ADMIN_EMAILS.includes(user.email?.toLowerCase());
  const btnBase = `flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] px-1.5 py-1 rounded-lg transition-colors`;
  const btnColors = theme === 'dark'
    ? 'hover:bg-white/5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
    : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600';

  return (
    <header className={`border-b sticky top-0 z-40 transition-colors duration-200 pt-[env(safe-area-inset-top)] ${
      theme === 'dark' 
        ? 'border-slate-800 bg-slate-950/95 backdrop-blur-md' 
        : 'border-slate-200 bg-white/95 backdrop-blur-md'
    }`}>
      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-extrabold tracking-tight text-sky-500">
              LiftForecast
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

            {(() => {
              const slug = SPOT_SLUG_MAP[selectedLake];
              if (!slug) return null;
              const today = new Date().toISOString().split('T')[0];
              const act = selectedActivity || 'kiting';
              return (
                <button
                  onClick={() => { window.location.href = `/day/${slug}/${today}?activity=${act}`; }}
                  aria-label="Session Day Leaderboard"
                  className={`${btnBase} ${theme === 'dark'
                    ? 'hover:bg-amber-500/10 text-amber-400/70 hover:text-amber-400'
                    : 'hover:bg-amber-50 text-amber-500/60 hover:text-amber-600'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span className="text-[8px] leading-none font-medium">Board</span>
                </button>
              );
            })()}

            <button onClick={onSMSClick} aria-label="Text Alerts" className={`${btnBase} relative ${btnColors}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span className="text-[8px] leading-none font-medium">SMS</span>
              {getSMSPrefs().enabled && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              )}
            </button>

            <button onClick={onGarminClick} aria-label="Link Garmin Watch" className={`${btnBase} ${btnColors}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-[8px] leading-none font-medium">Watch</span>
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

            {isAdmin && (
              <button
                onClick={() => { window.location.hash = '#admin'; }}
                aria-label="Admin Dashboard"
                className={`${btnBase} ${theme === 'dark'
                  ? 'hover:bg-violet-500/10 text-violet-400/70 hover:text-violet-400'
                  : 'hover:bg-violet-50 text-violet-500/60 hover:text-violet-600'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="text-[8px] leading-none font-medium">Admin</span>
              </button>
            )}

            {user ? (
              <button
                onClick={signOut}
                aria-label="Sign Out"
                className={`${btnBase} ${theme === 'dark'
                  ? 'hover:bg-red-500/10 text-slate-400 hover:text-red-400'
                  : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
                }`}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-[8px] leading-none font-medium">Out</span>
              </button>
            ) : (
              <button
                onClick={() => { window.location.hash = '#login'; }}
                aria-label="Log In"
                className={`${btnBase} ${theme === 'dark'
                  ? 'hover:bg-sky-500/10 text-sky-400/70 hover:text-sky-400'
                  : 'hover:bg-sky-50 text-sky-500/60 hover:text-sky-600'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span className="text-[8px] leading-none font-medium">Log In</span>
              </button>
            )}

            {!isPro && (
              <button
                onClick={onUpgradeClick}
                className="ml-1 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-sm hover:shadow-lg hover:shadow-sky-500/25 transition-all hover:scale-105 active:scale-95"
              >
                Upgrade
              </button>
            )}
            {isPro && rawTier === 'pro' && (
              <button
                onClick={handleManageSubscription}
                disabled={managingSubscription}
                className="ml-1 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 transition-all disabled:opacity-50"
                title="Manage Subscription"
              >
                <Crown className="w-3 h-3" />
                <span>PRO</span>
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
