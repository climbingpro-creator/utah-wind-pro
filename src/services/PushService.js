/**
 * Client-side push notification subscription manager.
 *
 * Flow:
 *  1. Call subscribeToPush(token) — requests notification permission,
 *     subscribes via pushManager, POSTs keys to /api/push-subscribe
 *  2. Call unsubscribeFromPush(token) — unsubscribes and DELETEs
 *  3. Call getPushStatus() — returns 'subscribed' | 'unsubscribed' | 'denied' | 'unsupported'
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function getPushStatus() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'subscribed' : 'unsubscribed';
  } catch {
    return 'unsupported';
  }
}

export async function subscribeToPush(authToken) {
  if (!VAPID_PUBLIC_KEY) throw new Error('VAPID public key not configured');
  if (!('serviceWorker' in navigator)) throw new Error('Service workers not supported');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const subJson = sub.toJSON();
  const resp = await fetch('/api/push-subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save push subscription');
  }

  return sub;
}

export async function unsubscribeFromPush(authToken) {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();

  if (sub) {
    const endpoint = sub.endpoint;
    await sub.unsubscribe();

    if (authToken) {
      await fetch('/api/push-subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
  }
}
