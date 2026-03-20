import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isIOS() {
  return Capacitor.getPlatform() === 'ios';
}

export function isAndroid() {
  return Capacitor.getPlatform() === 'android';
}

export function isWeb() {
  return Capacitor.getPlatform() === 'web';
}

const VERCEL_ORIGIN = 'https://utah-wind-pro.vercel.app';

export function apiUrl(path) {
  return isNativeApp() ? `${VERCEL_ORIGIN}${path}` : path;
}
