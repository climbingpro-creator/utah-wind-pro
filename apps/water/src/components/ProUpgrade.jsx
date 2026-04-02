import { useState } from 'react';
import { X, Check, Lock, Fish, Anchor, Map, BarChart3, Crown, Sparkles, Droplets, Waves, Thermometer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const FEATURES = [
  { icon: Fish,       label: 'Basic fishing conditions',            free: true,  pro: true },
  { icon: Map,        label: 'Interactive water map',               free: true,  pro: true },
  { icon: Droplets,   label: 'Current wind & wave status',          free: true,  pro: true },
  { icon: BarChart3,  label: 'Pressure gradient display',           free: true,  pro: true },
  { icon: Map,        label: 'All Utah lakes & rivers',             free: false, pro: true },
  { icon: Thermometer,label: 'Water temperature modeling',          free: false, pro: true },
  { icon: Fish,       label: 'AI fishing intelligence & species',   free: false, pro: true },
  { icon: Waves,      label: 'Glass water predictions',             free: false, pro: true },
  { icon: BarChart3,  label: 'USGS flow & gauge data',              free: false, pro: true },
  { icon: Anchor,     label: 'Boating safety scores',               free: false, pro: true },
  { icon: Crown,      label: 'Priority support & updates',          free: false, pro: true },
];

export default function ProUpgrade() {
  const { user, signInWithMagicLink, upgradeToPro, startTrial, trialActive, trialDaysLeft, closePaywall } = useAuth();
  const { theme } = useTheme();
  const [isYearly, setIsYearly] = useState(true);
  const [email, setEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const dark = theme === 'dark';

  async function handleMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) return;
    
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);
    try {
      await signInWithMagicLink(email);
      setAuthSuccess('Check your email for a sign-in link!');
    } catch (err) {
      console.error('[ProUpgrade] Magic link error:', err);
      setAuthError(err.message || 'Failed to send magic link');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleUpgrade() {
    try {
      await upgradeToPro();
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function handleStartTrial() {
    startTrial();
    closePaywall();
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePaywall} />
      <div className={`relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border ${
        dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
      }`}>
        <button
          onClick={closePaywall}
          className={`absolute top-4 right-4 p-1.5 rounded-full z-10 ${
            dark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-t-2xl px-6 pt-8 pb-6 text-center bg-gradient-to-br from-cyan-500 via-blue-500 to-emerald-500">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-8 w-32 h-32 rounded-full bg-white blur-3xl" />
            <div className="absolute bottom-4 right-8 w-24 h-24 rounded-full bg-white blur-2xl" />
          </div>
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              Unlock the full experience
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-1">
              NotWindy <span className="text-yellow-300">Pro</span>
            </h2>
            <p className="text-sm text-white/80">
              Complete water intelligence for Utah anglers & boaters.
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Pricing toggle */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                !isYearly
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                isYearly
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : dark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                -17%
              </span>
            </button>
          </div>

          {/* Price display */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className={`text-4xl font-extrabold ${dark ? 'text-white' : 'text-slate-900'}`}>
                ${isYearly ? '4.99' : '5.99'}
              </span>
              <span className={`text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                /month
              </span>
            </div>
            {isYearly && (
              <p className={`text-xs mt-1 ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                $59.99 billed annually (save $12)
              </p>
            )}
          </div>

          {/* Feature comparison */}
          <div className="space-y-0.5">
            <div className="grid grid-cols-[1fr_52px_52px] gap-1 px-2 pb-2">
              <span className={`text-[10px] uppercase font-bold tracking-wider ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Feature</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider text-center ${dark ? 'text-slate-500' : 'text-slate-400'}`}>Free</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-center text-cyan-500">Pro</span>
            </div>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_52px_52px] gap-1 items-center px-2 py-1.5 rounded-lg ${
                  !f.free ? (dark ? 'bg-cyan-500/5' : 'bg-cyan-50/80') : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <f.icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                    f.free ? (dark ? 'text-slate-500' : 'text-slate-400') : 'text-cyan-500'
                  }`} />
                  <span className={`text-xs truncate ${
                    dark ? 'text-slate-300' : 'text-slate-700'
                  } ${!f.free ? 'font-medium' : ''}`}>
                    {f.label}
                  </span>
                </div>
                <div className="flex justify-center">
                  {f.free
                    ? <Check className="w-4 h-4 text-emerald-500" />
                    : <Lock className="w-3.5 h-3.5 text-slate-400/50" />}
                </div>
                <div className="flex justify-center">
                  <Check className="w-4 h-4 text-cyan-500" />
                </div>
              </div>
            ))}
          </div>

          {/* CTA section */}
          {!user ? (
            <div className="space-y-3">
              {/* Trial CTA */}
              {!trialActive && (
                <button
                  onClick={handleStartTrial}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Start 7-Day Free Trial
                </button>
              )}

              {trialActive && (
                <div className={`text-center p-3 rounded-xl text-sm font-medium ${
                  dark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  Trial active — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
                </div>
              )}

              <div className={`relative text-center ${dark ? 'text-slate-600' : 'text-slate-300'}`}>
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${dark ? 'border-slate-700' : 'border-slate-200'}`} />
                </div>
                <span className={`relative px-3 text-xs ${dark ? 'bg-slate-900' : 'bg-white'}`}>
                  or sign in to subscribe
                </span>
              </div>

              <form onSubmit={handleMagicLink} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none focus:ring-2 focus:ring-cyan-500/40 ${
                    dark
                      ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  }`}
                />
                {authError && (
                  <p className="text-xs text-red-500 text-center">{authError}</p>
                )}
                {authSuccess && (
                  <p className="text-xs text-emerald-500 text-center">{authSuccess}</p>
                )}
                <button
                  type="submit"
                  disabled={authLoading || !email.trim()}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    dark
                      ? 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  } disabled:opacity-50`}
                >
                  {authLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
                <p className={`text-center text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                  We'll email you a link to sign in — no password needed.
                </p>
              </form>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleUpgrade}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {isYearly ? 'Subscribe — $59.99/year' : 'Subscribe — $5.99/month'}
              </button>
              <p className={`text-center text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>
                Cancel anytime. Instant access to all Pro features.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
