// Test script for offline functionality
// Open browser console and paste this to test

console.log('🧪 Testing Offline Mode Functionality');

// Test 1: Check if offline service is working
console.log('1. Checking offline service...');
if (window.offlineService) {
    console.log('✅ Offline service detected');
} else {
    console.log('❌ Offline service not found');
}

// Test 2: Check if sync service is working
console.log('2. Checking sync service...');
if (window.syncService) {
    console.log('✅ Sync service detected');
} else {
    console.log('❌ Sync service not found');
}

// Test 3: Simulate offline mode
console.log('3. Testing offline simulation...');
window.addEventListener('offline', () => {
    console.log('📴 Browser went offline - offline mode should activate');
});

window.addEventListener('online', () => {
    console.log('🌐 Browser came online - sync should start');
});

// Test 4: Check PWA features
console.log('4. Checking PWA features...');
if ('serviceWorker' in navigator) {
    console.log('✅ Service Worker supported');
} else {
    console.log('❌ Service Worker not supported');
}

if ('caches' in window) {
    console.log('✅ Cache API supported');
} else {
    console.log('❌ Cache API not supported');
}

// Test 5: Check manifest
console.log('5. Checking PWA manifest...');
fetch('/manifest.json')
    .then(response => response.json())
    .then(manifest => {
        console.log('✅ PWA manifest found:', manifest.name);
    })
    .catch(() => {
        console.log('❌ PWA manifest not found');
    });

console.log('🧪 Test script loaded. Open browser DevTools to see results.');