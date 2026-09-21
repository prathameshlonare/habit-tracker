import { Capacitor } from '@capacitor/core';

const DAILY_IDS = [1001, 1002];
const DAILY_TIMES = [
  { id: 1001, hour: 9, minute: 0, title: 'Morning check-in', body: 'Log your habits for today.' },
  { id: 1002, hour: 18, minute: 0, title: 'Evening check-in', body: 'Close out your habits before bed.' },
];

export function isNative() {
  return Capacitor.isNativePlatform();
}

async function withNotifications(fn) {
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  return fn(LocalNotifications);
}

export async function permissionState() {
  if (!isNative()) {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  }
  const permission = await withNotifications((n) => n.checkPermissions());
  return permission.display;
}

export async function ensurePermissions() {
  if (!isNative()) {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  }
  const permission = await withNotifications((n) => n.requestPermissions());
  return permission.display === 'granted';
}

export async function scheduleDaily(settings) {
  if (!isNative()) return;
  await withNotifications((n) => n.cancel({ notifications: DAILY_IDS.map((id) => ({ id })) }));
  if (!settings?.dailyReminders) return;
  if ((await permissionState()) !== 'granted') return;
  await withNotifications((n) => n.schedule({
    notifications: DAILY_TIMES.map((slot) => ({
      id: slot.id,
      title: slot.title,
      body: slot.body,
      schedule: { on: { hour: slot.hour, minute: slot.minute }, allowWhileIdle: true },
      smallIcon: 'ic_launcher',
    })),
  }));
}

let achievementId = 2000;

export async function notifyAchievement(title, body, settings) {
  if (!settings?.achievementNotifications) return;
  if (!isNative()) {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: './icons/icon-192.png' });
    }
    return;
  }
  if ((await permissionState()) !== 'granted') return;
  await withNotifications((n) =>
    n.schedule({
      notifications: [{ id: ++achievementId, title, body, schedule: { at: new Date(Date.now() + 1000) } }],
    })
  );
}
