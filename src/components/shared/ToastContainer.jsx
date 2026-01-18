import React from 'react';
import '../Toast.css';

/**
 * Toast notification container component
 * @param {Array} toasts - Array of toast objects
 * @param {Function} onRemove - Callback to remove a toast
 */
const ToastContainer = ({ toasts, onRemove }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className={`toast ${toast.type}`}>
                    <div className="toast-icon">
                        {toast.type === 'achievement' && '🎉'}
                        {toast.type === 'streak' && '🔥'}
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'default' && '📝'}
                    </div>
                    <div className="toast-content">
                        <div className="toast-title">{toast.title}</div>
                        <div className="toast-message">{toast.message}</div>
                    </div>
                    <button className="toast-close" onClick={() => onRemove(toast.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
