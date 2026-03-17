import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({ user: null, session: null, tier: 'free', loading: true });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchTier(s.access_token);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchTier(s.access_token);
      else setTier('free');
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchTier(token) {
    try {
      const resp = await fetch('/api/thermal-forecast?lake=utah-lake-zigzag', {
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

  async function upgradeToPro() {
    if (!session) throw new Error('Must be signed in');
    const resp = await fetch('/api/subscribe', {
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
    const resp = await fetch('/api/subscribe?action=portal', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { url, error } = await resp.json();
    if (error) throw new Error(error);
    window.location.href = url;
  }

  return (
    <AuthContext.Provider value={{
      user, session, tier, loading,
      signIn, signUp, signOut,
      upgradeToPro, manageSubscription,
      isPro: tier === 'pro',
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
