/**
 * useModelContext — Fetches the server model context every 5 minutes.
 * Falls back to localStorage cache for offline / stale scenarios.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const CONTEXT_URL = '/api/cron/collect?action=context';
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const LS_KEY = 'uwf_model_context';
const STALE_THRESHOLD = 15 * 60 * 1000; // 15 minutes

function loadCached() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveCache(ctx) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ctx));
  } catch { /* quota exceeded, ignore */ }
}

export function useModelContext() {
  const [modelContext, setModelContext] = useState(() => loadCached());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);
  const hasContextRef = useRef(!!modelContext);

  // Keep ref in sync so the callback never closes over stale state
  useEffect(() => { hasContextRef.current = !!modelContext; }, [modelContext]);

  const fetchContext = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(CONTEXT_URL);
      if (!res.ok) throw new Error(`Context fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.error && !data.lagCorrelations) throw new Error(data.error);

      setModelContext(data);
      setLastUpdated(Date.now());
      setError(null);
      saveCache(data);
    } catch (err) {
      console.warn('useModelContext fetch error:', err.message);
      setError(err.message);
      if (!hasContextRef.current) {
        const cached = loadCached();
        if (cached) {
          setModelContext(cached);
        }
      }
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchContext();
    const id = setInterval(fetchContext, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchContext]);

  // Derive isStale from lastUpdated without needing a timer effect
  const isStale = useMemo(() => {
    if (!lastUpdated) return true;
    return Date.now() - lastUpdated > STALE_THRESHOLD;
  }, [lastUpdated]);

  return { modelContext, isStale, lastUpdated, error, refetch: fetchContext };
}
