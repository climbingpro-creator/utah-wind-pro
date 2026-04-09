import { PushNotifications } from '@capacitor/push-notifications';
import { apiUrl, isIOS } from '@utahwind/weather';

let registered = false;

function getPlatformInfo() {
  const ios = isIOS();
  return {
    token_type: ios ? 'apns' : 'fcm',
    platform: ios ? 'ios' : 'android',
  };
}

export async function getNativePushStatus() {
  try {
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === 'granted') {
      return registered ? 'subscribed' : 'unsubscribed';
    }
    if (receive === 'denied') return 'denied';
    return 'unsubscribed';
  } catch {
    return 'unsupported';
  }
}

export async function subscribeToNativePush(authToken) {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') {
    throw new Error('Push notification permission denied');
  }

  const { token_type, platform } = getPlatformInfo();

  return new Promise((resolve, reject) => {
    PushNotifications.addListener('registration', async (token) => {
      registered = true;
      try {
        const resp = await fetch(apiUrl('/api/push-subscribe'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            token: token.value,
            token_type,
            platform,
          }),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          reject(new Error(err.error || 'Failed to register push token'));
          return;
        }
        resolve(token.value);
      } catch (err) {
        reject(err);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      reject(new Error(err.error || 'Push registration failed'));
    });

    PushNotifications.register();
  });
}

export async function unsubscribeFromNativePush(authToken) {
  const { platform } = getPlatformInfo();
  registered = false;
  if (authToken) {
    await fetch(apiUrl('/api/push-subscribe'), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ platform }),
    }).catch(() => {});
  }
}

export function initNativePushListeners(onNotification) {
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    if (onNotification) {
      onNotification(notification);
    }
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification?.data;
    if (data?.url) {
      window.location.hash = data.url;
    }
  });
}
