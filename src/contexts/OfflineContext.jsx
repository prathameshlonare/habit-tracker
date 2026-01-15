import React, { createContext, useContext, useState, useEffect } from 'react';
import offlineService from '../services/offlineService';
import syncService from '../services/syncService';

const OfflineContext = createContext({});

export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
      setPendingActions(offlineService.getQueueLength());
    };

    const handleOnline = async () => {
      setIsOnline(true);
      updateStatus();
      // Auto-sync when coming back online
      if (offlineService.getQueueLength() > 0) {
        await syncNow();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial queue
    offlineService.loadQueue();
    updateStatus();

    // Set last sync time if exists
    const lastSyncTime = syncService.getLastSyncTime();
    if (lastSyncTime > 0) {
      setLastSync(new Date(lastSyncTime));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = async () => {
    if (syncInProgress || pendingActions === 0) return;
    
    setSyncInProgress(true);
    try {
      await syncService.processQueuedActions();
      setLastSync(new Date());
      setPendingActions(0); // Queue should be empty after successful sync
    } catch (error) {
      console.error('Sync failed:', error);
      // Don't clear pending actions on error
    } finally {
      setSyncInProgress(false);
    }
  };

  const value = {
    isOnline,
    pendingActions,
    lastSync,
    syncInProgress,
    syncNow
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};