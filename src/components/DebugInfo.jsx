import React from 'react';
import { useOffline } from '../contexts/OfflineContext';
import * as firestoreService from '../services/firestoreService';

const DebugInfo = ({ userId, habits, journalEntries }) => {
    const { isOnline } = useOffline();
    
    const cachedHabits = firestoreService.getCachedHabits(userId);
    const cachedJournal = firestoreService.getCachedJournal(userId);
    
    return (
        <div style={{
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: 'black',
            color: 'white',
            padding: '10px',
            borderRadius: '5px',
            fontSize: '12px',
            zIndex: 1001,
            maxWidth: '300px'
        }}>
            <div>🌐 Online: {isOnline ? 'Yes' : 'No'}</div>
            <div>📊 UI Habits: {habits.length}</div>
            <div>💾 Cached Habits: {cachedHabits.length}</div>
            <div>📝 UI Journal: {Object.keys(journalEntries).length}</div>
            <div>💾 Cached Journal: {Object.keys(cachedJournal).length}</div>
            <div>👤 User ID: {userId?.slice(0, 10)}...</div>
        </div>
    );
};

export default DebugInfo;