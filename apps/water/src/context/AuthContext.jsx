import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@utahwind/database';

const TRIAL_KEY = 'uwg_trial_start';
const TRIAL_DAYS = 7;
const ADMIN_EMAILS = ['tyler@aspenearth.com', 'climbingpro@gmail.com'];
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || import.meta.env.VITE_WIND_APP_URL || 'https://utah-wind-pro.vercel.app';

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
    }).catch(() => {
      setLoading(false);
    });

    const params = new URLSearchParams(window.location.search);
    if (params.get('subscription') === 'success') {
      window.history.replaceState({}, '', window.location.pathname);
    }

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
      const resp = await fetch(`${API_ORIGIN}/api/user-preferences?app=water`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setTier(data.tier || 'free');
        return;
      }
    } catch { /* fall through */ }
    setTier('free');
  }

  async function signIn(email, password) {
    if (!supabase) throw new Error('Auth not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password) {
    if (!supabase) throw new Error('Auth not configured');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    return data;
  }

  async function signInWithMagicLink(email) {
    if (!supabase) throw new Error('Auth not configured');
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
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
    const resp = await fetch(`${API_ORIGIN}/api/subscribe`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ app: 'water' }),
    });
    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Failed to start checkout. Please try again.');
    }
    if (data.error) throw new Error(data.error);
    if (!data.url) throw new Error('No checkout URL returned');
    window.location.href = data.url;
  }

  async function manageSubscription() {
    if (!session) throw new Error('Must be signed in - no session found');
    const endpoint = `${API_ORIGIN}/api/subscribe?action=portal`;
    const resp = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const text = await resp.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Invalid response from subscription portal`);
    }
    if (data.error) throw new Error(data.error);
    if (!data.url) throw new Error('No portal URL returned');
    window.location.href = data.url;
  }

  const openPaywall = useCallback(() => setShowPaywall(true), []);
  const closePaywall = useCallback(() => setShowPaywall(false), []);

  return (
    <AuthContext.Provider value={{
      user, session, tier: effectiveTier, rawTier: tier, loading,
      signIn, signUp, signInWithMagicLink, signOut,
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
