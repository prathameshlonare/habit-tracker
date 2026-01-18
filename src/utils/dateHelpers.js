/**
 * Date utility functions for Habit Tracker
 */

/**
 * Formats a date key (YYYY-MM-DD) to display format
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export const formatDisplayDate = (dateKey) => {
    const [year, month, day] = dateKey.split('-');
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata'
    });
};

/**
 * Gets current date in YYYY-MM-DD format
 * @returns {string} Today's date key
 */
export const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

/**
 * Gets date key for a specific date
 * @param {Date} date - Date object
 * @returns {string} Date key in YYYY-MM-DD format
 */
export const getDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
