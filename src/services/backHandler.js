import { Capacitor } from '@capacitor/core';

const stack = [];

export function pushSheet(id, close) {
  removeSheet(id);
  stack.push({ id, close });
}

export function removeSheet(id) {
  const i = stack.findIndex((s) => s.id === id);
  if (i >= 0) stack.splice(i, 1);
}

let listening = false;

export async function initBackHandler() {
  if (!Capacitor.isNativePlatform() || listening) return;
  listening = true;
  const { App } = await import('@capacitor/app');
  await App.addListener('backButton', () => {
    const top = stack[stack.length - 1];
    if (top) {
      top.close();
      return;
    }
    const state = window.history.state;
    const idx = state && typeof state.idx === 'number' ? state.idx : 0;
    if (idx > 0) {
      window.history.back();
    } else {
      void App.exitApp();
    }
  });
}
