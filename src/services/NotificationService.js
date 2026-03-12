/**
 * NOTIFICATION SERVICE
 * 
 * Handles scheduling and sending notifications for thermal forecasts
 * at three key times:
 * 
 * 1. EVENING (6-9 PM): Tomorrow's outlook
 * 2. MORNING (6-9 AM): Today's forecast
 * 3. PRE-THERMAL (1-2 hrs before): Imminent alert
 */

const NOTIFICATION_KEY = 'utah-wind-notifications';
const LAST_SENT_KEY = 'utah-wind-last-notification';

/**
 * Check if notifications are supported and enabled
 */
export function canNotify() {
  if (!('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Request notification permission
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    return false;
  }
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Get notification preferences from localStorage
 */
export function getNotificationPrefs() {
  try {
    const saved = localStorage.getItem(NOTIFICATION_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error reading notification prefs:', e);
  }
  
  return {
    enabled: false,
    dayBefore: true,
    morning: true,
    preThermal: true,
    minProbability: {
      dayBefore: 60,
      morning: 50,
      preThermal: 60,
    },
    lakes: ['utah-lake-zigzag'], // Default lake
  };
}

/**
 * Save notification preferences
 */
export function saveNotificationPrefs(prefs) {
  try {
    localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Error saving notification prefs:', e);
  }
}

/**
 * Check if we've already sent a notification for this time window
 */
function hasRecentlyNotified(type) {
  try {
    const saved = localStorage.getItem(LAST_SENT_KEY);
    if (!saved) return false;
    
    const lastSent = JSON.parse(saved);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const hour = now.getHours();
    
    // For day-before, check if we sent one today evening
    if (type === 'day-before') {
      return lastSent.dayBefore === today && hour >= 18;
    }
    
    // For morning, check if we sent one today morning
    if (type === 'morning') {
      return lastSent.morning === today && hour >= 6 && hour < 12;
    }
    
    // For pre-thermal, check if we sent one in the last 2 hours
    if (type === 'pre-thermal') {
      const lastTime = lastSent.preThermalTime ? new Date(lastSent.preThermalTime) : null;
      if (lastTime) {
        const diffMs = now - lastTime;
        return diffMs < 2 * 60 * 60 * 1000; // 2 hours
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

/**
 * Mark that we've sent a notification
 */
function markNotified(type) {
  try {
    const saved = localStorage.getItem(LAST_SENT_KEY);
    const lastSent = saved ? JSON.parse(saved) : {};
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    
    if (type === 'day-before') {
      lastSent.dayBefore = today;
    } else if (type === 'morning') {
      lastSent.morning = today;
    } else if (type === 'pre-thermal') {
      lastSent.preThermalTime = now.toISOString();
    }
    
    localStorage.setItem(LAST_SENT_KEY, JSON.stringify(lastSent));
  } catch (e) {
    console.error('Error marking notification:', e);
  }
}

/**
 * Send a notification
 */
export function sendNotification(title, body, options = {}) {
  if (!canNotify()) {
    console.log('Notifications not enabled');
    return null;
  }
  
  const notification = new Notification(title, {
    body,
    icon: '/wind-icon.png',
    badge: '/wind-badge.png',
    tag: options.tag || 'utah-wind',
    requireInteraction: options.important || false,
    ...options,
  });
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
  
  // Vibrate if supported
  if ('vibrate' in navigator && options.important) {
    navigator.vibrate([200, 100, 200]);
  }
  
  return notification;
}

/**
 * Check and send appropriate notifications based on current conditions
 */
export function checkAndNotify(forecast, lakeName = 'Utah Lake') {
  const prefs = getNotificationPrefs();
  
  if (!prefs.enabled || !canNotify()) {
    return;
  }
  
  const now = new Date();
  const hour = now.getHours();
  
  // Evening notification (6-9 PM)
  if (prefs.dayBefore && hour >= 18 && hour <= 21) {
    const prob = forecast.allForecasts?.dayBefore?.probability || 0;
    if (prob >= prefs.minProbability.dayBefore && !hasRecentlyNotified('day-before')) {
      sendNotification(
        `🌬️ Tomorrow at ${lakeName}`,
        forecast.allForecasts.dayBefore.message,
        { tag: 'day-before', important: prob >= 80 }
      );
      markNotified('day-before');
    }
  }
  
  // Morning notification (6-9 AM)
  if (prefs.morning && hour >= 6 && hour <= 9) {
    const prob = forecast.allForecasts?.morning?.probability || 0;
    if (prob >= prefs.minProbability.morning && !hasRecentlyNotified('morning')) {
      const peakTime = forecast.allForecasts.morning.expectedPeakTime || '11:00-13:00';
      sendNotification(
        `☀️ Thermal Forecast for ${lakeName}`,
        `${forecast.allForecasts.morning.message}\nExpected peak: ${peakTime}`,
        { tag: 'morning', important: prob >= 80 }
      );
      markNotified('morning');
    }
  }
  
  // Pre-thermal notification (9 AM - 2 PM)
  if (prefs.preThermal && hour >= 9 && hour <= 14) {
    const prob = forecast.allForecasts?.preThermal?.probability || 0;
    const timeToThermal = forecast.allForecasts?.preThermal?.timeToThermal;
    
    if (prob >= prefs.minProbability.preThermal && 
        timeToThermal != null && 
        timeToThermal <= 60 &&
        !hasRecentlyNotified('pre-thermal')) {
      sendNotification(
        `⚡ Thermal Alert - ${lakeName}`,
        timeToThermal <= 30 
          ? `Thermal starting NOW! ${forecast.allForecasts.preThermal.message}`
          : `Thermal in ~${timeToThermal} min! ${forecast.allForecasts.preThermal.message}`,
        { tag: 'pre-thermal', important: true, requireInteraction: true }
      );
      markNotified('pre-thermal');
    }
  }
}

/**
 * Get human-readable notification schedule
 */
export function getNotificationScheduleDescription() {
  const prefs = getNotificationPrefs();
  
  if (!prefs.enabled) {
    return 'Notifications disabled';
  }
  
  const times = [];
  if (prefs.dayBefore) times.push('Evening (6-9 PM) for tomorrow');
  if (prefs.morning) times.push('Morning (6-9 AM) for today');
  if (prefs.preThermal) times.push('1-2 hours before thermal');
  
  return times.length > 0 
    ? `Alerts: ${times.join(', ')}`
    : 'No alerts configured';
}
