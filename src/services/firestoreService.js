import { db } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    onSnapshot
} from 'firebase/firestore';
import syncService from './syncService';

/**
 * Syncs habits from localStorage to Firestore if they don't exist
 */
export const migrateHabitsToFirestore = async (userId, localHabits) => {
    if (!localHabits || localHabits.length === 0) return;

    const habitsRef = collection(db, 'users', userId, 'habits');

    for (const habit of localHabits) {
        const habitDoc = doc(habitsRef, habit.id);
        await setDoc(habitDoc, {
            ...habit,
            updatedAt: new Date()
        }, { merge: true });
    }
};

/**
 * Syncs journal entries from localStorage to Firestore
 */
export const migrateJournalToFirestore = async (userId, localEntries) => {
    if (!localEntries || Object.keys(localEntries).length === 0) return;

    const journalRef = collection(db, 'users', userId, 'journal');

    for (const [date, entry] of Object.entries(localEntries)) {
        const entryDoc = doc(journalRef, date);
        await setDoc(entryDoc, {
            ...entry,
            updatedAt: new Date()
        }, { merge: true });
    }
};

/**
 * Sets up a listener for habits
 */
export const subscribeToHabits = (userId, callback) => {
    const habitsRef = collection(db, 'users', userId, 'habits');
    return onSnapshot(habitsRef, (snapshot) => {
        const habits = snapshot.docs.map(doc => doc.data());
        callback(habits);
    });
};

/**
 * Sets up a listener for journal entries
 */
export const subscribeToJournal = (userId, callback) => {
    const journalRef = collection(db, 'users', userId, 'journal');
    return onSnapshot(journalRef, (snapshot) => {
        const entries = {};
        snapshot.docs.forEach(doc => {
            entries[doc.id] = doc.data();
        });
        callback(entries);
    });
};

/**
 * Updates a specific habit's logs
 */
export const updateHabitLogsInFirestore = async (userId, habitId, logs) => {
    const habitDoc = doc(db, 'users', userId, 'habits', habitId);
    await updateDoc(habitDoc, {
        logs,
        updatedAt: new Date()
    });
};

/**
 * Adds a new habit to Firestore
 */
export const addHabitToFirestore = async (userId, habit) => {
    const habitDoc = doc(db, 'users', userId, 'habits', habit.id);
    await setDoc(habitDoc, {
        ...habit,
        createdAt: new Date(),
        updatedAt: new Date()
    });
};

/**
 * Updates a habit's name
 */
export const updateHabitNameInFirestore = async (userId, habitId, name) => {
    const habitDoc = doc(db, 'users', userId, 'habits', habitId);
    await updateDoc(habitDoc, {
        name,
        updatedAt: new Date()
    });
};

/**
 * Deletes a habit from Firestore
 */
export const deleteHabitFromFirestore = async (userId, habitId) => {
    const habitDoc = doc(db, 'users', userId, 'habits', habitId);
    await deleteDoc(habitDoc);
};

/**
 * Saves a journal entry to Firestore
 */
export const saveJournalEntryInFirestore = async (userId, date, entry) => {
    const entryDoc = doc(db, 'users', userId, 'journal', date);
    await setDoc(entryDoc, {
        ...entry,
        updatedAt: new Date()
    }, { merge: true });
};

/**
 * Deletes all habits for a user
 */
export const deleteAllHabitsFromFirestore = async (userId) => {
    const habitsRef = collection(db, 'users', userId, 'habits');
    const snapshot = await getDocs(habitsRef);

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
};

/**
 * Deletes all journal entries for a user
 */
export const deleteAllJournalEntriesFromFirestore = async (userId) => {
    const journalRef = collection(db, 'users', userId, 'journal');
    const snapshot = await getDocs(journalRef);

    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
};

/**
 * Deletes ALL user data (habits and journal entries)
 */
export const deleteAllUserDataFromFirestore = async (userId) => {
    await Promise.all([
        deleteAllHabitsFromFirestore(userId),
        deleteAllJournalEntriesFromFirestore(userId)
    ]);
};

// ==================== OFFLINE-ENABLED FUNCTIONS ====================

/**
 * Offline-enabled habit toggle
 */
export const toggleHabitOffline = async (userId, habitId, dateKey, completed) => {
    // Update local state immediately for UI responsiveness
    const localHabits = JSON.parse(localStorage.getItem(`habits_${userId}`) || '[]');
    const habitIndex = localHabits.findIndex(h => h.id === habitId);

    if (habitIndex !== -1) {
        if (completed) {
            localHabits[habitIndex].logs[dateKey] = true;
        } else {
            delete localHabits[habitIndex].logs[dateKey];
        }
        localStorage.setItem(`habits_${userId}`, JSON.stringify(localHabits));
    }

    // Use sync service for offline-aware sync
    await syncService.syncHabitToggle(userId, habitId, dateKey, completed);
};

/**
 * Online-only new habit addition (disabled offline)
 */
export const addHabitOffline = async (userId, habit) => {
    // Only add habits when online (as per requirement)
    if (!navigator.onLine) {
        throw new Error('Cannot add habits while offline');
    }

    // Update local state immediately
    const localHabits = JSON.parse(localStorage.getItem(`habits_${userId}`) || '[]');
    localHabits.push(habit);
    localStorage.setItem(`habits_${userId}`, JSON.stringify(localHabits));

    // Use sync service for direct sync
    await syncService.syncNewHabit(userId, habit);
};

/**
 * Online-only habit name update (disabled offline)
 */
export const updateHabitNameOffline = async (userId, habitId, name) => {
    // Only update habit names when online
    if (!navigator.onLine) {
        throw new Error('Cannot edit habits while offline');
    }

    // Update local state immediately
    const localHabits = JSON.parse(localStorage.getItem(`habits_${userId}`) || '[]');
    const habitIndex = localHabits.findIndex(h => h.id === habitId);

    if (habitIndex !== -1) {
        localHabits[habitIndex].name = name;
        localStorage.setItem(`habits_${userId}`, JSON.stringify(localHabits));
    }

    // Use sync service for direct sync
    await syncService.syncUpdateHabitName(userId, habitId, name);
};

/**
 * Offline-enabled habit deletion
 */
export const deleteHabitOffline = async (userId, habitId) => {
    // Update local state immediately
    const localHabits = JSON.parse(localStorage.getItem(`habits_${userId}`) || '[]');
    const filteredHabits = localHabits.filter(h => h.id !== habitId);
    localStorage.setItem(`habits_${userId}`, JSON.stringify(filteredHabits));

    // Use sync service for offline-aware sync
    await syncService.syncDeleteHabit(userId, habitId);
};

/**
 * Online-only journal entry save (disabled offline)
 */
export const saveJournalEntryOffline = async (userId, date, entry) => {
    // Only save journal entries when online
    if (!navigator.onLine) {
        throw new Error('Cannot save journal entries while offline');
    }

    // Update local state immediately
    const localJournal = JSON.parse(localStorage.getItem(`journal_${userId}`) || '{}');
    localJournal[date] = entry;
    localStorage.setItem(`journal_${userId}`, JSON.stringify(localJournal));

    // Use sync service for direct sync
    await syncService.syncJournalEntry(userId, date, entry);
};

/**
 * Cache habits locally for offline access
 */
export const cacheHabitsLocally = (userId, habits) => {
    try {
        // Cache to multiple locations for robustness
        localStorage.setItem(`habits_${userId}`, JSON.stringify(habits));
        localStorage.setItem(`habits_${userId}_backup`, JSON.stringify(habits));
        if (process.env.NODE_ENV === 'development') {
        }
    } catch (error) {
        console.error('❌ Failed to cache habits:', error);
    }
};

/**
 * Cache journal entries locally for offline access
 */
export const cacheJournalLocally = (userId, entries) => {
    localStorage.setItem(`journal_${userId}`, JSON.stringify(entries));
};

/**
 * Get cached habits for offline access
 */
export const getCachedHabits = (userId) => {
    try {
        // Try multiple cache keys for robustness
        const cacheKeys = [`habits_${userId}`, `habits_${userId}_backup`];
        let habits = [];

        for (const key of cacheKeys) {
            const cached = localStorage.getItem(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.length > 0) {
                    habits = parsed;
                    break;
                }
            }
        }

        return habits;
    } catch (error) {
        console.error('❌ Failed to load cached habits:', error);
        return [];
    }
};

/**
 * Get cached journal entries for offline access
 */
export const getCachedJournal = (userId) => {
    const cached = localStorage.getItem(`journal_${userId}`);
    return cached ? JSON.parse(cached) : {};
};

