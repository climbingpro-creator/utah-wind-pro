import { isNativeApp } from '@utahwind/weather';

let Haptics = null;
let ImpactStyle = null;
let NotificationType = null;

const init = (async () => {
  if (!isNativeApp()) return;
  try {
    const mod = await import('@capacitor/haptics');
    Haptics = mod.Haptics;
    ImpactStyle = mod.ImpactStyle;
    NotificationType = mod.NotificationType;
  } catch { /* not available */ }
})();

export async function impactLight() {
  await init;
  Haptics?.impact({ style: ImpactStyle?.Light }).catch(() => {});
}

export async function impactMedium() {
  await init;
  Haptics?.impact({ style: ImpactStyle?.Medium }).catch(() => {});
}

export async function impactHeavy() {
  await init;
  Haptics?.impact({ style: ImpactStyle?.Heavy }).catch(() => {});
}

export async function notificationSuccess() {
  await init;
  Haptics?.notification({ type: NotificationType?.Success }).catch(() => {});
}

export async function notificationWarning() {
  await init;
  Haptics?.notification({ type: NotificationType?.Warning }).catch(() => {});
}

export async function selectionChanged() {
  await init;
  Haptics?.selectionChanged().catch(() => {});
}
