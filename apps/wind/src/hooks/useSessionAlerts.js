/**
 * useSessionAlerts — CRUD hook for per-spot session alert subscriptions.
 *
 * Fetches existing alerts on mount, and exposes saveAlert / deleteAlert helpers
 * that POST/DELETE to /api/session-alerts.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@utahwind/weather';
import { useAuth } from '../context/AuthContext';

export default function useSessionAlerts() {
  const { session, isPro } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const headers = useCallback(() => {
    const h = { 'Content-Type': 'application/json' };
    if (session?.access_token) h.Authorization = `Bearer ${session.access_token}`;
    return h;
  }, [session]);

  // Fetch all alerts on mount (Pro only)
  useEffect(() => {
    if (!isPro || !session) return;
    setLoading(true);

    fetch(apiUrl('/api/session-alerts'), { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setAlerts(data.alerts || []);
        setError(null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isPro, session, headers]);

  /**
   * Upsert a session alert.
   * @param {{ spotId: string, discipline: string, minWindMph: number }} data
   */
  const saveAlert = useCallback(async (data) => {
    const resp = await fetch(apiUrl('/api/session-alerts'), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(data),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save alert');
    }

    const saved = await resp.json();

    setAlerts(prev => {
      const idx = prev.findIndex(a => a.spot_id === saved.spot_id && a.discipline === saved.discipline);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    return saved;
  }, [headers]);

  /**
   * Delete a session alert.
   */
  const deleteAlert = useCallback(async (spotId, discipline) => {
    const resp = await fetch(apiUrl('/api/session-alerts'), {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ spotId, discipline }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to delete alert');
    }

    setAlerts(prev => prev.filter(a => !(a.spot_id === spotId && a.discipline === discipline)));
  }, [headers]);

  /**
   * Find an existing alert for a specific spot + discipline combo.
   */
  const getAlert = useCallback(
    (spotId, discipline) => alerts.find(a => a.spot_id === spotId && a.discipline === discipline) || null,
    [alerts],
  );

  return { alerts, loading, error, saveAlert, deleteAlert, getAlert };
}
