import { showToast } from './toastHelpers';

/**
 * Notification utility functions
 */

/**
 * Requests browser notification permission
 * @returns {Promise<boolean>} True if permission granted
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
};

/**
 * Shows a browser notification
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 */
export const showNotification = (title, options = {}) => {
    if (!('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        new Notification(title, options);
    }
};

/**
 * Checks habits for achievements and shows notifications
 * @param {Array} habits - Array of habit objects
 * @param {Object} settings - User settings
 */
export const checkAndNotifyAchievements = (habits, settings) => {
    if (!settings.achievementNotifications) return;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Check if all habits completed today
    if (habits.length > 0) {
        const allCompleted = habits.every(habit => habit.logs[todayKey]);

        if (allCompleted) {
            showToast('🎉 All Habits Completed!', 'Amazing work! You completed all your habits today!', 'achievement');
        }
    }

    // Check for streaks
    habits.forEach(habit => {
        const logs = Object.keys(habit.logs || {}).sort();
        if (logs.length === 0) return;

        let streak = 0;
        let checkDate = new Date(today);

        // Calculate current streak
        while (true) {
            const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
            if (habit.logs[key]) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // Notify on milestone streaks
        if (streak === 3) {
            showToast('🔥 3-Day Streak!', `Great job on "${habit.name}"!`, 'streak');
            showNotification('🔥 3-Day Streak!', { body: `Great job on "${habit.name}"!` });
        } else if (streak === 7) {
            showToast('🔥 Week Streak!', `Amazing! 7 days of "${habit.name}"!`, 'streak');
            showNotification('🔥 Week Streak!', { body: `Amazing! 7 days of "${habit.name}"!` });
        } else if (streak === 14) {
            showToast('🔥 2-Week Streak!', `Incredible! "${habit.name}" for 14 days!`, 'streak');
            showNotification('🔥 2-Week Streak!', { body: `Incredible! "${habit.name}" for 14 days!` });
        } else if (streak === 30) {
            showToast('🔥 MONTH STREAK!', `LEGENDARY! 30 days of "${habit.name}"!`, 'achievement');
            showNotification('🔥 MONTH STREAK!', { body: `LEGENDARY! 30 days of "${habit.name}"!` });
        }
    });
};
