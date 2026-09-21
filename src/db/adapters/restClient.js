// Phase 2+ placeholder: desktop driver talking to Node background server.
// Phase 1: not used. Detects server availability, otherwise caller keeps local repo.
// Future job: fetch http://localhost:3210/api/* with same function names as repo.js.

export const DRIVER = 'rest-node-server';
export const STATUS = 'ready-phase-2';
// Same origin in dev via vite proxy (/api), absolute URL when served by Node.
export const SERVER_URL = '';

async function req(path, options = {}) {
  const res = await fetch(`${SERVER_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export async function isServerAvailable(timeoutMs = 1500) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export const listHabits = () => req('/habits');
export const addHabit = (name) => req('/habits', { method: 'POST', body: JSON.stringify({ name }) });
export const renameHabit = (id, name) => req(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) });
export const deleteHabit = (id) => req(`/habits/${id}`, { method: 'DELETE' });
export const toggleLog = (habit_id, date_key) =>
  req('/logs/toggle', { method: 'POST', body: JSON.stringify({ habit_id, date_key }) });
export const getJournal = (date) => req(`/journal/${date}`);
export const listJournal = () => req('/journal');
export const saveJournal = (date, entry) => req(`/journal/${date}`, { method: 'PUT', body: JSON.stringify(entry) });
export const getSettings = () => req('/settings');
export const saveSettings = (obj) => req('/settings', { method: 'PUT', body: JSON.stringify(obj) });
