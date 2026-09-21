import { useEffect, useState } from 'react';
import * as repo from '../db/repo';

// Small hooks so screens stop touching dbService/localStorage directly.
// Phase 1: backed by localStorage via repo.js. Later repo swaps to SQLite.

export function useHabits() {
  const [habits, setHabits] = useState(() => repo.listHabits());
  useEffect(() => repo.subscribeHabits(setHabits), []);
  return habits;
}

export function useJournal() {
  const [entries, setEntries] = useState(() => repo.getJournal());
  useEffect(() => repo.subscribeJournal(setEntries), []);
  return entries;
}

export function useSettings() {
  const [settings, setSettingsState] = useState(() => repo.getSettings());
  const update = (next) => setSettingsState(repo.saveSettings(next));
  return [settings, update];
}
