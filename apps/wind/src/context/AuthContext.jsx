import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@utahwind/database';
import { apiUrl } from '@utahwind/weather';

const TRIAL_KEY = 'uwf_trial_start';
const TRIAL_DAYS = 7;
const ADMIN_EMAILS = ['climbingpro@gmail.com'];

const AuthContext = createContext({
  user: null, session: null, tier: 'free', loading: true,
  trialActive: false, trialDaysLeft: 0, showPaywall: false,
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const [trialStart, setTrialStart] = useState(() => {
    const stored = localStorage.getItem(TRIAL_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const trialDaysLeft = trialStart
    ? Math.max(0, TRIAL_DAYS - Math.floor((Date.now() - trialStart) / 86400000))
    : TRIAL_DAYS;
  const trialActive = trialStart !== null && trialDaysLeft > 0;
  const effectiveTier = tier === 'pro' ? 'pro' : (trialActive ? 'pro' : 'free');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        if (ADMIN_EMAILS.includes(s.user.email?.toLowerCase())) setTier('pro');
        else fetchTier(s.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        if (ADMIN_EMAILS.includes(s.user.email?.toLowerCase())) setTier('pro');
        else fetchTier(s.access_token);
      } else setTier('free');
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchTier(token) {
    try {
      const resp = await fetch(apiUrl('/api/user-preferences'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setTier(data.tier || 'free');
        return;
      }
    } catch { /* fall through */ }

    try {
      const resp = await fetch(apiUrl('/api/thermal-forecast?lake=utah-lake-zigzag'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json();
      setTier(data.meta?.tier || 'free');
    } catch {
      setTier('free');
    }
  }

  async function signIn(email, password) {
    if (!supabase) throw new Error('Auth not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    if (!supabase) throw new Error('Auth not configured');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setTier('free');
  }

  function startTrial() {
    const now = Date.now();
    localStorage.setItem(TRIAL_KEY, String(now));
    setTrialStart(now);
  }

  async function upgradeToPro() {
    if (!session) {
      setShowPaywall(true);
      return;
    }
    const resp = await fetch(apiUrl('/api/subscribe'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });
    const { url, error } = await resp.json();
    if (error) throw new Error(error);
    window.location.href = url;
  }

  async function manageSubscription() {
    if (!session) throw new Error('Must be signed in');
    const resp = await fetch(apiUrl('/api/subscribe?action=portal'), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { url, error } = await resp.json();
    if (error) throw new Error(error);
    window.location.href = url;
  }

  const openPaywall = useCallback(() => setShowPaywall(true), []);
  const closePaywall = useCallback(() => setShowPaywall(false), []);

  return (
    <AuthContext.Provider value={{
      user, session, tier: effectiveTier, rawTier: tier, loading,
      signIn, signUp, signOut,
      upgradeToPro, manageSubscription,
      isPro: effectiveTier === 'pro',
      trialActive, trialDaysLeft, startTrial,
      showPaywall, openPaywall, closePaywall,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
