# Assignment Mismatch Fix

## Problem Description
Videos were showing as "AWAITING PICKUP" on the landing page even when they were already assigned. However, navigating to the workspace for those videos showed they were correctly assigned. This indicated a synchronization issue between the assignment state and how it was being displayed.

## Root Causes Identified

### 1. **Caching Issues**
The browser and/or Next.js were potentially caching the `/api/videos` response, causing the VideoGrid to display stale assignment data even after successful assignments.

### 2. **Race Conditions**
The refresh was happening immediately after assignment creation, potentially before the database transaction was fully committed, leading to the VideoGrid fetching outdated data.

### 3. **Insufficient Logging**
There was limited visibility into when assignments were created and when the frontend refreshed, making it difficult to diagnose timing issues.

## Changes Made

### 1. AssignmentModal.tsx
**File:** `/my-app/src/components/AssignmentModal.tsx`

**Changes:**
- Reordered the success flow: close modal first, then add a 100ms delay, then trigger refresh
- This ensures the database transaction has time to commit before the refresh occurs
- Added timing to prevent race conditions

```typescript
// OLD:
onAssignmentSuccess();
onClose();

// NEW:
onClose();
await new Promise(resolve => setTimeout(resolve, 100));
onAssignmentSuccess();
```

### 2. VideoGrid.tsx
**File:** `/my-app/src/components/VideoGrid.tsx`

**Changes:**
- Added cache-busting parameters to both initial fetch and refresh
- Added `cache: 'no-store'` and explicit `Cache-Control` headers
- Enhanced logging to show detailed assignment information after each refresh
- This ensures we always get fresh data from the server

```typescript
// Added cache-busting
const cacheBuster = `?_t=${Date.now()}`;
const response = await fetch(`/api/videos${cacheBuster}`, {
    cache: 'no-store',
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
    }
});
```

### 3. /api/videos Route
**File:** `/my-app/src/app/api/videos/route.ts`

**Changes:**
- Enhanced query to exclude COMPLETED assignments from the landing page view
- Added `orderBy` to ensure most recent assignments are returned first
- Added comprehensive logging for each video's assignment status
- This helps diagnose issues and ensures proper data filtering

```typescript
assignments: {
    where: { 
        labelType: 'OFFENSE',
        status: { notIn: ['COMPLETED'] }
    },
    orderBy: {
        assignedAt: 'desc'
    },
    // ... rest of select
}
```

### 4. /api/videos/[id]/assign Route
**File:** `/my-app/src/app/api/videos/[id]/assign/route.ts`

**Changes:**
- Enhanced logging when assignments are created
- Now includes video title in the response for better debugging
- Added console logs to track assignment creation

## How to Test

1. **Navigate to the landing page** - Note which videos are in the "In Queue" section
2. **As an admin, assign a video** to a user using the ASSIGN button
3. **Watch the console logs** to see:
   - `[Assign API] ✅ ASSIGNMENT CREATED:` - Shows the assignment was created
   - `[VideoGrid] Videos refreshed` - Shows the refresh happened
   - Each video's assignment status
4. **Verify the video moved** from "In Queue" to "Explore Projects" section
5. **Navigate to the workspace** for that video - Should show the same assignment

## Expected Behavior After Fix

1. ✅ When you assign a video, it should immediately move from "In Queue" to "Explore Projects"
2. ✅ The assignment status should be consistent between landing page and workspace
3. ✅ Refreshing the landing page should show the correct current state
4. ✅ Console logs should show clear assignment creation and refresh events

## Additional Notes

- The 100ms delay in AssignmentModal is a safety buffer for database commit time
- Cache-busting ensures we never use stale data from browser cache
- The enhanced logging helps diagnose any future issues
- Excluding COMPLETED assignments prevents clutter on the landing page

## Monitoring

Check these console logs to verify the fix is working:
- `[Assign API] ✅ ASSIGNMENT CREATED:` - When assignment is created
- `[VideoGrid] Refresh details:` - Shows current state after refresh
- `[Videos API] Video "Title": ASSIGNED to user@email.com (ASSIGNED)` - Shows each video's status

If you still see mismatches, check:
1. The timestamps in the logs to ensure refresh happens after assignment
2. The assignment status in the database directly
3. Browser dev tools Network tab to ensure requests aren't cached

