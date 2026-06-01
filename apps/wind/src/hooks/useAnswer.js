/**
 * useAnswer — Single-fetch hook for the /api/answer verdict.
 *
 * Polls every 3 minutes (matches cron + cache TTL).
 * Also refetches on visibility change (user switches back to tab).
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const ANSWER_URL = '/api/answer';
const POLL_INTERVAL = 3 * 60 * 1000;

export function useAnswer(spot, activity = 'kiting') {
  const [answer, setAnswer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);
  const intervalRef = useRef(null);

  const fetchAnswer = useCallback(async () => {
    if (fetchingRef.current || !spot) return;
    fetchingRef.current = true;

    try {
      const url = `${ANSWER_URL}?spot=${encodeURIComponent(spot)}&activity=${encodeURIComponent(activity)}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Answer fetch failed: ${res.status}`);
      }

      const data = await res.json();
      setAnswer(data);
      setError(null);
    } catch (err) {
      console.warn('[useAnswer] fetch error:', err.message);
      setError(err.message);
    } finally {
      fetchingRef.current = false;
      setIsLoading(false);
    }
  }, [spot, activity]);

  useEffect(() => {
    setIsLoading(true);
    setAnswer(null);
    fetchAnswer();

    intervalRef.current = setInterval(fetchAnswer, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchAnswer]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        fetchAnswer();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchAnswer]);

  return { answer, isLoading, error, refetch: fetchAnswer };
}
