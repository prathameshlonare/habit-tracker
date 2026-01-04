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

