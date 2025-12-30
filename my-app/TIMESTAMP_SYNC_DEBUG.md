# Timestamp Sync Inconsistency - Debugging & Fix

## 🔍 **Issue Reported**
> "The video switch going to the same timestamp doesn't seem to be consistent when I'm in QC."

Camera switches sometimes don't maintain the exact same timestamp, causing the new camera to start at a different time than expected.

---

## 🧪 **Diagnostic Logging Added**

### What We're Now Tracking

When you switch cameras, the console will show **detailed diagnostics**:

```
🎥 [CAMERA SWITCH + TIMESTAMP SYNC DEBUG] ===========================
🔄 Switching camera: CAM 1 -> CAM 2
📍 Previous video currentTime: 45.234
📏 Previous video duration: 360.5
📊 Previous video readyState: 4
🌐 Previous video networkState: 1
⏸️  Was playing: true
---
📏 New video duration: 360.5
📊 New video readyState: 4
🌐 New video networkState: 1
📍 New video BEFORE sync: 12.5
🎯 Target timestamp to sync: 45.234
⚡ Video already ready (readyState: 4)
🎯 Adjusted target time: 45.234 (capped to duration)
📍 Setting currentTime from 12.5 to 45.234
✅ Seek completed! (seeked event fired)
📍 New video currentTime AFTER seek: 45.234
❓ Difference from target: 0.000 seconds
▶️  Playback resumed
⏱️  Total switch time: 123.45 ms
📍 Final video time after resume: 45.234
🎥 [CAMERA SWITCH + TIMESTAMP SYNC DEBUG] ===========================
```

### 🚨 **If Sync Fails, You'll See:**

```
🚨 TIMESTAMP SYNC FAILED! Difference > 0.5s
   Expected: 45.234
   Got: 40.123
   This is the QC inconsistency issue!
   Attempting correction...
```

---

## 🔧 **Root Cause Analysis**

### **Potential Causes Identified:**

1. **Seek Operation Not Completing**
   - Setting `video.currentTime = X` triggers a **seek operation**
   - The seek is **asynchronous** - doesn't complete immediately
   - Old code didn't wait for seek to finish
   - Could start playing before seek completes → inconsistent timestamp

2. **Race Condition**
   - If `play()` is called while seek is still in progress
   - Browser may start from wrong position
   - Especially problematic with cached videos (faster loading)

3. **ReadyState Differences**
   - `readyState >= 1` means metadata loaded
   - But doesn't guarantee seek will work perfectly
   - Some browsers handle seeks differently at different readyStates

4. **QC Mode Specific**
   - QC users likely have different:
     - Browser cache state (cleaner cache)
     - Network conditions
     - Video loading patterns
   - This changes timing of events → exposes race condition

---

## ✅ **Fix Implemented**

### **Use `seeked` Event**

Instead of:
```typescript
// OLD - DON'T WAIT FOR SEEK
video.currentTime = targetTime;
video.play(); // May start before seek completes!
```

Now using:
```typescript
// NEW - WAIT FOR SEEK TO COMPLETE
const handleSeeked = () => {
  console.log('✅ Seek completed!');
  // Now it's safe to play
  video.play();
};

video.addEventListener('seeked', handleSeeked, { once: true });
video.currentTime = targetTime; // Triggers seek
```

### **Fallback Timeout**

In case `seeked` event doesn't fire (rare browser bug):
```typescript
const seekTimeout = setTimeout(() => {
  console.warn('⚠️  Seeked event timeout - proceeding anyway');
  video.removeEventListener('seeked', handleSeeked);
  handleSeeked(); // Call manually
}, 500);
```

### **Timestamp Verification**

After seek completes, we verify it worked:
```typescript
const diff = Math.abs(video.currentTime - targetTime);
if (diff > 0.5) {
  console.error('🚨 TIMESTAMP SYNC FAILED!');
  // Attempt correction
  video.currentTime = targetTime;
}
```

---

## 🧪 **How to Test**

### **1. Test in QC Mode**

1. Open a workspace with assigned video
2. Submit the video (mark as complete)
3. Refresh page and enable QC mode
4. Play video to 30 seconds
5. Switch to CAM 2
6. **Expected**: CAM 2 starts at exactly 30 seconds
7. Switch to CAM 3
8. **Expected**: CAM 3 starts at exactly 30 seconds

### **2. Check Console Logs**

Open browser DevTools console and look for:

✅ **Success Pattern:**
```
📍 New video currentTime AFTER seek: 30.000
❓ Difference from target: 0.000 seconds
```

❌ **Failure Pattern:**
```
🚨 TIMESTAMP SYNC FAILED! Difference > 0.5s
   Expected: 30.000
   Got: 25.456
```

### **3. Rapid Switching Test**

1. Play video
2. Rapidly switch between all cameras
3. Pause and note the time
4. Switch cameras again
5. **Expected**: All cameras show exact same time (paused)

### **4. Edge Cases**

**Test different scenarios:**
- Switch while playing → Should maintain time + playing state
- Switch while paused → Should maintain time + paused state
- Switch at start (0:00) → Should stay at 0:00
- Switch near end → Should not exceed video duration
- Switch between videos of different lengths → Should cap to shorter duration

---

## 📊 **Expected Results**

### **Before Fix:**
- ❌ Timestamp sync inconsistent in QC mode
- ❌ Sometimes videos jump to wrong time
- ❌ Race conditions with seek operations
- ❌ No visibility into why sync fails

### **After Fix:**
- ✅ Timestamp sync is reliable (waits for seek)
- ✅ Comprehensive logging shows exactly what's happening
- ✅ Auto-correction if sync fails
- ✅ Fallback timeout prevents hangs
- ✅ Works consistently in QC mode

---

## 🔍 **Monitoring & Debugging**

### **What to Watch For**

1. **"Seeked event timeout" warnings**
   - If you see this frequently, seek operations are taking too long
   - May indicate slow storage/network
   - Or browser-specific issues

2. **"TIMESTAMP SYNC FAILED" errors**
   - If you see this, the seek didn't go to target time
   - Check if auto-correction worked
   - May need to investigate browser/video codec issues

3. **Slow switch times (> 500ms)**
   - Should be < 100ms with preloading
   - If consistently slow, check:
     - Are videos actually preloaded? (check for green dots)
     - Network issues?
     - Large video files?

### **Advanced Debugging**

If issues persist, check these video properties:

```javascript
// In browser console while on workspace page
const video = document.querySelector('video');
console.log({
  currentTime: video.currentTime,
  duration: video.duration,
  readyState: video.readyState,
  networkState: video.networkState,
  paused: video.paused,
  seeking: video.seeking, // Is seek in progress?
  seekable: video.seekable, // What ranges can be seeked to?
  buffered: video.buffered, // What's buffered?
});
```

---

## 📝 **Implementation Details**

### **Files Modified**
- `src/components/workspace/VideoPlayer.tsx`
  - Added extensive timestamp sync logging
  - Implemented `seeked` event waiting
  - Added seek verification and auto-correction
  - Added fallback timeouts

### **Key Changes**

1. **Seeked Event Handling** (Lines ~320-370)
   - Listen for `seeked` event before continuing
   - Clear timeout when seek completes naturally
   - Fallback after 500ms if event doesn't fire

2. **Timestamp Verification** (Lines ~330-340)
   - Check actual time vs target time
   - Log error if difference > 0.5s
   - Attempt correction automatically

3. **Comprehensive Logging** (Throughout switch logic)
   - Log all video states before/after
   - Track seek operation timing
   - Highlight failures clearly

---

## 🎯 **Next Steps**

1. **Test the fix** - Try rapid camera switching in QC mode
2. **Check console logs** - Look for sync errors
3. **Report results** - Share any remaining issues with logs
4. **Monitor performance** - Check if seeking is fast enough

If you still see inconsistencies after this fix, the logs will tell us **exactly why** it's failing!

---

## 📞 **If Issues Persist**

Gather this information:
1. Full console logs during a failed switch
2. Browser and version
3. Video file details (duration, codec)
4. Steps to reproduce

The diagnostic logging will pinpoint the exact issue! 🎯

