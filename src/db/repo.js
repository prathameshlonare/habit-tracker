// Single-user, fully offline repository. Web stays localStorage-backed;
// native Android flushes every mutation to SQLite (source of truth on device).
// UI must only import from this file, never touch localStorage or SQL directly.
import { Capacitor } from '@capacitor/core';

const KEYS = {
  habits: 'habitTracker_habits_local',
  journal: 'habitTracker_journal_local',
  settings: 'habitTracker_settings_local',
};

const DEFAULT_SETTINGS = {
  dailyReminders: true,
  weeklyReport: true,
  achievementNotifications: true,
  startOfWeek: 'Monday',
  timezone: 'IST',
  theme: 'Light',
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Local save failed:', key, err);
  }
}

// No user/profile concept: single device, single owner, fully offline.
// Drops the legacy profile key once if it exists from older builds.
try {
  localStorage.removeItem('habitTracker_profile_local');
} catch {
  /* storage unavailable */
}

// In-memory caches + listener sets (mirrors future SQLite subscribe pattern)
let habitsCache = loadJSON(KEYS.habits, []);
let journalCache = loadJSON(KEYS.journal, {});
let settingsCache = { ...DEFAULT_SETTINGS, ...loadJSON(KEYS.settings, {}) };
// Migrate old per-user settings key once (habitTrackerSettings_local)
if (Object.keys(loadJSON(KEYS.settings, {})).length === 0) {
  const legacy = loadJSON('habitTrackerSettings_local', null);
  if (legacy) {
    settingsCache = { ...DEFAULT_SETTINGS, ...legacy };
    saveJSON(KEYS.settings, settingsCache);
  }
}
const habitsListeners = new Set();
const journalListeners = new Set();

let driver = null;
let readyPromise = null;

function flushDriver(task) {
  if (!driver) return;
  task().catch((err) => console.error('SQLite flush failed:', err));
}

export function ready() {
  if (!readyPromise) readyPromise = initStorage();
  return readyPromise;
}

async function initStorage() {
  if (!Capacitor.isNativePlatform()) return 'local';
  try {
    const sqlite = await import('./adapters/capacitorSqlite');
    await sqlite.init();
    driver = sqlite;
  } catch (err) {
    console.error('SQLite init failed, staying on localStorage:', err);
    return 'local';
  }
  const stored = await driver.loadAll();
  const driverEmpty =
    stored.habits.length === 0 &&
    Object.keys(stored.journal).length === 0 &&
    Object.keys(stored.settings).length === 0;
  const localHadData =
    habitsCache.length > 0 || Object.keys(journalCache).length > 0;
  if (driverEmpty && localHadData) {
    await driver.writeHabits(habitsCache);
    await driver.writeJournal(journalCache);
    await driver.writeSettings(settingsCache);
  } else if (!driverEmpty) {
    habitsCache = stored.habits;
    journalCache = stored.journal;
    settingsCache = { ...DEFAULT_SETTINGS, ...stored.settings };
    saveJSON(KEYS.habits, habitsCache);
    saveJSON(KEYS.journal, journalCache);
    saveJSON(KEYS.settings, settingsCache);
    habitsListeners.forEach((cb) => cb([...habitsCache]));
    journalListeners.forEach((cb) => cb({ ...journalCache }));
  }
  return 'sqlite';
}

function persistHabits() {
  saveJSON(KEYS.habits, habitsCache);
  habitsListeners.forEach((cb) => cb([...habitsCache]));
  flushDriver(() => driver.writeHabits(habitsCache));
}
function persistJournal() {
  saveJSON(KEYS.journal, journalCache);
  journalListeners.forEach((cb) => cb({ ...journalCache }));
  flushDriver(() => driver.writeJournal(journalCache));
}

export function subscribeHabits(callback) {
  habitsListeners.add(callback);
  callback([...habitsCache]);
  return () => habitsListeners.delete(callback);
}

export function subscribeJournal(callback) {
  journalListeners.add(callback);
  callback({ ...journalCache });
  return () => journalListeners.delete(callback);
}

export function listHabits() {
  return [...habitsCache];
}

export function addHabit(name, extra = {}) {
  const clean = (name || '').trim();
  if (!clean) return null;
  const habit = {
    id: Date.now().toString(),
    name: clean,
    color: extra.color || '',
    icon: extra.icon || '',
    archived: 0,
    logs: {},
  };
  habitsCache = [...habitsCache, habit];
  persistHabits();
  return habit;
}

export function renameHabit(habitId, name) {
  const clean = (name || '').trim();
  if (!clean) return;
  habitsCache = habitsCache.map((h) => (h.id === habitId ? { ...h, name: clean } : h));
  persistHabits();
}

export function deleteHabit(habitId) {
  habitsCache = habitsCache.filter((h) => h.id !== habitId);
  persistHabits();
}

export function toggleHabitLog(habitId, dateKey) {
  let changed = false;
  habitsCache = habitsCache.map((h) => {
    if (h.id !== habitId) return h;
    const logs = { ...(h.logs || {}) };
    if (logs[dateKey]) delete logs[dateKey];
    else logs[dateKey] = true;
    changed = true;
    return { ...h, logs };
  });
  if (changed) persistHabits();
  return changed;
}

export function setHabitLogs(habitId, logs) {
  habitsCache = habitsCache.map((h) => (h.id === habitId ? { ...h, logs: { ...logs } } : h));
  persistHabits();
}

export function getJournal() {
  return { ...journalCache };
}

export function saveJournalEntry(dateKey, entry) {
  journalCache = { ...journalCache, [dateKey]: { ...entry } };
  persistJournal();
}

export function getSettings() {
  return { ...settingsCache };
}

export function saveSettings(next) {
  settingsCache = { ...settingsCache, ...next };
  saveJSON(KEYS.settings, settingsCache);
  flushDriver(() => driver.writeSettings(settingsCache));
  return { ...settingsCache };
}

export function exportAll() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    habits: listHabits(),
    journal: getJournal(),
  };
}

export function importAll(data) {
  if (!data || typeof data !== 'object') return false;
  if (Array.isArray(data.habits)) {
    habitsCache = data.habits;
    persistHabits();
  }
  if (data.journal && typeof data.journal === 'object') {
    journalCache = data.journal;
    persistJournal();
  }
  if (data.settings) saveSettings(data.settings);
  return true;
}

export function clearAll() {
  habitsCache = [];
  journalCache = {};
  persistHabits();
  persistJournal();
  flushDriver(() => driver.clearAll());
}
