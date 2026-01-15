import React from 'react';
import { useOffline } from '../contexts/OfflineContext';

const OfflineIndicator = () => {
  const { isOnline, pendingActions, syncInProgress, syncNow } = useOffline();

  // Don't show anything if online and no pending actions
  if (isOnline && pendingActions === 0) return null;

  return (
    <div className={`offline-indicator ${isOnline ? 'syncing' : 'offline'}`}>
      <div className="indicator-content">
        {!isOnline ? (
          <>
            <span className="indicator-icon">📴</span>
            <span className="indicator-text">Offline Mode - Changes will sync when connection is restored</span>
          </>
        ) : (
          <>
            <span className="indicator-icon">
              {syncInProgress ? '⏳' : '🔄'}
            </span>
            <span className="indicator-text">
              {syncInProgress 
                ? 'Syncing changes...' 
                : `Ready to sync ${pendingActions} change${pendingActions !== 1 ? 's' : ''}`
              }
            </span>
            {!syncInProgress && pendingActions > 0 && (
              <button 
                className="sync-btn"
                onClick={syncNow}
                disabled={syncInProgress}
              >
                Sync Now
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;