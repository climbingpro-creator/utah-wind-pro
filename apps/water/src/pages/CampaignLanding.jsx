import { useEffect, Suspense, lazy } from 'react';
import { Fish, Waves, Clock, MapPin } from 'lucide-react';
import { trackEvent } from '@utahwind/ui';
import { useAuth } from '../context/AuthContext';
import { captureCampaignParams, getStoredUtms, trackMeta } from '../lib/campaign';

const ProUpgrade = lazy(() => import('../components/ProUpgrade'));

const SPOTS = [
  { name: 'Lower Provo', line: 'Afternoon Thermal Pull can kill the hatch window. Know when it lays down.' },
  { name: 'Green River A', line: 'Canyon Winds stack in the A Section. Check the glass before Dutch John.' },
  { name: 'Strawberry', line: 'Pre-Frontal Bite on the reservoir — go before the wind event, not after.' },
];

export default function CampaignLanding() {
  const { openPaywall, showPaywall, isPro, trialActive, trialDaysLeft } = useAuth();

  useEffect(() => {
    captureCampaignParams();
    trackMeta('ViewContent', {
      content_name: 'utah_anglers_launch',
      content_category: 'campaign',
      value: 5.99,
      currency: 'USD',
    });
    trackEvent('campaign_view', { page: 'go', ...getStoredUtms() });
    if (!isPro) openPaywall();
  }, [isPro, openPaywall]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            NotWindy
          </span>
          <a href="/" className="text-[11px] font-semibold text-slate-400 hover:text-white">
            Open the map
          </a>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10 space-y-8">
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-400">
            Utah fishing intelligence
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
            Know when Canyon Winds die — before you drive.
          </h1>
          <p className="text-slate-300 text-[15px] leading-relaxed">
            NotWindy reads wind, pressure, and hatches on Utah water. Claim 14 days of Pro,
            then $5.99/mo. Cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-center">
            <Clock className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trial</p>
            <p className="text-sm font-bold">14 days</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-center">
            <Fish className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Then</p>
            <p className="text-sm font-bold">$5.99/mo</p>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-3 text-center">
            <Waves className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Focus</p>
            <p className="text-sm font-bold">Glass water</p>
          </div>
        </div>

        <ul className="space-y-3">
          {SPOTS.map((spot) => (
            <li key={spot.name} className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {spot.name}
              </p>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{spot.line}</p>
            </li>
          ))}
        </ul>

        {trialActive && (
          <p className="text-sm text-emerald-400 font-medium text-center">
            Trial active — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
          </p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={openPaywall}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
          >
            {isPro ? 'You already have Pro' : 'Claim 14-day Pro trial'}
          </button>
          <a
            href="/"
            className="block w-full py-3 rounded-xl text-center text-sm font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.08]"
          >
            Browse Utah waters first
          </a>
        </div>
      </main>

      {showPaywall && (
        <Suspense fallback={null}>
          <ProUpgrade />
        </Suspense>
      )}
    </div>
  );
}
