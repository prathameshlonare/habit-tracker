// Phase 1: forward old Firestore-named API to new single-user local repo.
// App.jsx keeps calling these, no UI change needed. New code should import from src/db/repo.js.
import * as repo from '../db/repo';

export const migrateHabitsToFirestore = async () => {};
export const migrateJournalToFirestore = async () => {};

export const subscribeToHabits = (_userId, callback) => repo.subscribeHabits(callback);

export const subscribeToJournal = (_userId, callback) => repo.subscribeJournal(callback);

export const updateHabitLogsInFirestore = async (_userId, habitId, logs) => {
    repo.setHabitLogs(habitId, logs);
};

export const addHabitToFirestore = async (_userId, habit) => {
    // repo.addHabit creates its own id; if caller passed a full habit, preserve it
    if (habit && habit.id && habit.name) {
      const existing = repo.listHabits().some((h) => h.id === habit.id);
      if (!existing) {
        const created = repo.addHabit(habit.name, habit);
        // keep original id/logs when caller supplied them
        if (created && (created.id !== habit.id || JSON.stringify(habit.logs || {}) !== '{}')) {
          repo.deleteHabit(created.id);
          const all = repo.exportAll();
          all.habits.push({ id: habit.id, name: habit.name, color: '', icon: '', archived: 0, logs: habit.logs || {} });
          repo.importAll(all);
        }
      }
    } else if (habit && habit.name) {
      repo.addHabit(habit.name, habit);
    }
};

export const updateHabitNameInFirestore = async (_userId, habitId, name) => {
    repo.renameHabit(habitId, name);
};

export const deleteHabitFromFirestore = async (_userId, habitId) => {
    repo.deleteHabit(habitId);
};

export const saveJournalEntryInFirestore = async (_userId, date, entry) => {
    repo.saveJournalEntry(date, entry);
};

export const deleteAllHabitsFromFirestore = async () => {
    repo.listHabits().forEach((h) => repo.deleteHabit(h.id));
};

export const deleteAllJournalEntriesFromFirestore = async () => {
    const data = repo.exportAll();
    data.journal = {};
    repo.importAll(data);
};

export const deleteAllUserDataFromFirestore = async () => {
    repo.clearAll();
};

export const initStorage = () => repo.ready();

export const getSettings = () => repo.getSettings();

export const saveSettings = (settings) => repo.saveSettings(settings);
