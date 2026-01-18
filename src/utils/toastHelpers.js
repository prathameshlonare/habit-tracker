/**
 * Toast notification helpers
 */

let toastIdCounter = 0;
let addToastCallback = null;

/**
 * Sets the callback function for adding toasts
 * @param {Function} callback - Function to call when showing toast
 */
export const setToastCallback = (callback) => {
    addToastCallback = callback;
};

/**
 * Shows a toast notification
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - Toast type (default, success, error, achievement, streak)
 */
export const showToast = (title, message, type = 'default') => {
    if (!addToastCallback) return;

    const toast = {
        id: toastIdCounter++,
        title,
        message,
        type
    };

    addToastCallback(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => { }, 3000);
};
