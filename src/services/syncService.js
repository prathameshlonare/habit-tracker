import offlineService from './offlineService';
import * as firestoreService from './firestoreService';

class SyncService {
  constructor() {
    this.lastSyncTime = localStorage.getItem('lastSyncTime') || 0;
  }

  async syncHabitToggle(userId, habitId, dateKey, completed) {
    const action = {
      type: 'HABIT_TOGGLE',
      userId,
      habitId,
      dateKey,
      completed
    };

    if (offlineService.isOnline) {
      try {
        // First update local cache to prevent loss
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
        
        // Then sync to Firebase
        await firestoreService.updateHabitLogsInFirestore(userId, habitId, {
          [dateKey]: completed
        });
        this.updateLastSync();
      } catch (error) {
        console.error('Direct sync failed, queuing:', error);
        offlineService.addToQueue(action);
      }
    } else {
      // Queue for when online
      offlineService.addToQueue(action);
    }
  }

  async syncNewHabit(userId, habit) {
    const action = {
      type: 'ADD_HABIT',
      userId,
      habit
    };

    if (offlineService.isOnline) {
      try {
        await firestoreService.addHabitToFirestore(userId, habit);
        this.updateLastSync();
      } catch (error) {
        console.error('Direct sync failed, queuing:', error);
        offlineService.addToQueue(action);
      }
    } else {
      offlineService.addToQueue(action);
    }
  }

  async syncUpdateHabitName(userId, habitId, name) {
    const action = {
      type: 'UPDATE_HABIT_NAME',
      userId,
      habitId,
      name
    };

    if (offlineService.isOnline) {
      try {
        await firestoreService.updateHabitNameInFirestore(userId, habitId, name);
        this.updateLastSync();
      } catch (error) {
        console.error('Direct sync failed, queuing:', error);
        offlineService.addToQueue(action);
      }
    } else {
      offlineService.addToQueue(action);
    }
  }

  async syncDeleteHabit(userId, habitId) {
    const action = {
      type: 'DELETE_HABIT',
      userId,
      habitId
    };

    if (offlineService.isOnline) {
      try {
        await firestoreService.deleteHabitFromFirestore(userId, habitId);
        this.updateLastSync();
      } catch (error) {
        console.error('Direct sync failed, queuing:', error);
        offlineService.addToQueue(action);
      }
    } else {
      offlineService.addToQueue(action);
    }
  }

  async syncJournalEntry(userId, date, entry) {
    const action = {
      type: 'SAVE_JOURNAL_ENTRY',
      userId,
      date,
      entry
    };

    if (offlineService.isOnline) {
      try {
        await firestoreService.saveJournalEntryInFirestore(userId, date, entry);
        this.updateLastSync();
      } catch (error) {
        console.error('Direct sync failed, queuing:', error);
        offlineService.addToQueue(action);
      }
    } else {
      offlineService.addToQueue(action);
    }
  }

  async processQueuedActions() {
    const queue = offlineService.queue;
    
    for (const action of queue) {
      try {
        switch (action.type) {
          case 'HABIT_TOGGLE':
            await firestoreService.updateHabitLogsInFirestore(
              action.userId, 
              action.habitId, 
              { [action.dateKey]: action.completed }
            );
            break;
          case 'ADD_HABIT':
            await firestoreService.addHabitToFirestore(action.userId, action.habit);
            break;
          case 'UPDATE_HABIT_NAME':
            await firestoreService.updateHabitNameInFirestore(
              action.userId, 
              action.habitId, 
              action.name
            );
            break;
          case 'DELETE_HABIT':
            await firestoreService.deleteHabitFromFirestore(
              action.userId, 
              action.habitId
            );
            break;
          case 'SAVE_JOURNAL_ENTRY':
            await firestoreService.saveJournalEntryInFirestore(
              action.userId, 
              action.date, 
              action.entry
            );
            break;
          default:
            console.warn('Unknown action type:', action.type);
        }
      } catch (error) {
        console.error('Failed to process action:', error);
        throw error;
      }
    }
  }

  updateLastSync() {
    this.lastSyncTime = Date.now();
    localStorage.setItem('lastSyncTime', this.lastSyncTime.toString());
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }
}

export default new SyncService();