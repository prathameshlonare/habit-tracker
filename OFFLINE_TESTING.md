# Offline Mode Testing Guide

## 🧪 How to Test Offline Functionality

### 1. Basic Offline Testing
1. Open the app: http://localhost:5173
2. Login with your Google account
3. Once loaded, **disconnect from internet** (WiFi off, or use DevTools)
4. Try these operations:
   - ✅ Tick/untick habits
   - ✅ Add new habit
   - ✅ Navigate between pages
   - ✅ Edit habit names
   - ✅ Write journal entries

### 2. Testing Offline Indicators
- **Offline mode:** Should show 📴 "Offline Mode" banner
- **Online with pending:** Should show 🔄 "Ready to sync X changes" banner
- **Sync in progress:** Should show ⏳ "Syncing changes..." banner

### 3. Testing Sync Functionality
1. Add some habits/ticks while offline
2. Reconnect to internet
3. Should see:
   - 🔄 Sync indicator appears
   - ✅ Changes automatically sync to Firebase
   - 🎉 Banner disappears when complete

### 4. Testing Data Persistence
1. Make changes while offline
2. **Close browser tab**
3. Reopen app (still offline)
4. Should see:
   - ✅ All your changes are still there
   - ✅ No data lost

### 5. Advanced Testing Scenarios

#### Scenario A: Long Offline Period
- Stay offline for hours/days
- Make many changes
- Come back online
- Should sync all changes correctly

#### Scenario B: Intermittent Connection
- Toggle internet on/off rapidly
- App should handle gracefully
- No data corruption

#### Scenario C: Large Data Volume
- Add many habits
- Check many days
- Test performance with lots of data

### 6. Browser DevTools Testing
Open DevTools → Network tab:
- Set "Offline" in throttling dropdown
- Test app behavior in offline mode

### 7. Mobile Testing
- Test on actual mobile device
- Install as PWA (Add to Home Screen)
- Test offline experience on phone

## 🔍 Expected Results

✅ **Should Work:**
- All CRUD operations offline
- Data persistence across sessions
- Automatic sync when online
- Clear offline/online indicators
- No data loss

⚠️ **Known Limitations (Basic Mode):**
- No background sync
- Last-write-wins conflict resolution
- Manual sync may be needed sometimes

## 🐛 Troubleshooting

### Issue: Changes not syncing
**Solution:** Click "Sync Now" button when online

### Issue: Data lost after refresh
**Solution:** Check localStorage usage - may be full

### Issue: Offline indicator not showing
**Solution:** Check browser console for errors

### Issue: App not loading offline
**Solution:** Try clearing cache and reloading

## 📱 Testing on Your Friend's Phone

1. **Install PWA:**
   - Open app in Chrome on Android
   - Tap "Add to Home Screen"
   - Test as installed app

2. **Village Scenario Test:**
   - Go to area with no internet
   - Use app normally
   - Return to area with internet
   - Verify auto-sync

3. **Battery Usage Test:**
   - Use app for extended period offline
   - Check battery impact
   - Should be minimal