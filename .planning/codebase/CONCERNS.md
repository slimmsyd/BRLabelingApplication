# Codebase Concerns

**Analysis Date:** 2026-04-30

## Tech Debt

**S3 Storage Provider Stubbed (Migration Not Started):**
- Issue: `src/lib/storage/s3-provider.ts` has all methods throwing "not yet implemented" errors (lines 21, 31, 41, 46)
- Files: `src/lib/storage/s3-provider.ts`, `src/lib/storage/supabase-provider.ts`
- Impact: All uploads still go to Supabase. If S3 is truly required, this becomes a blocker
- Fix approach: Implement S3 client using AWS SDK v3 (s3, cloudfront), add presigned POST URLs, test multipart upload progress tracking

**Event Save Uses Delete-All-Then-Create Strategy (Risky for Partial Failures):**
- Issue: `src/app/api/videos/[id]/events/route.ts` lines 74-77 delete ALL existing events, then create new ones. No transaction wraps both operations
- Files: `src/app/api/videos/[id]/events/route.ts` (lines 74-77)
- Impact: If creation fails midway or connection drops, all events are lost with no rollback. User thinks they saved, but DB is empty
- Fix approach: Wrap in Prisma transaction, or implement upsert-by-ID pattern (update existing, insert new, delete others in one transaction)

**Excessive Debug Logging in Production Code:**
- Issue: Multiple DEBUG/PERMISSIONS/QC/RBAC/CAMERA SWITCH logs scattered throughout with emoji prefixes; particularly verbose in auth and workspace flows
- Files: 
  - `src/app/workspace/page.tsx` (lines 168, 171, 177, 184, 491, 515, 828, 937, 942, 955, 1063)
  - `src/components/workspace/VideoPlayer.tsx` (lines 197, 213, 217, 220, 233-261, 319-487, 787)
  - `src/app/api/auth/login/route.ts` (lines 23-47)
  - `src/lib/external-api.ts` (lines 64-85, 126-150)
- Impact: Massive console noise in production, performance overhead from large JSON.stringify calls, credential/email leaks in logs
- Fix approach: Remove or move to environment-gated DEBUG mode, use structured logging (pino/winston) instead of console.log

**Signup Domain Restriction Hidden in Code (Security Misalignment):**
- Issue: `src/app/api/auth/signup/route.ts` lines 20-32 silently reject non-@boxraw.com emails with generic "contact admin" error. Domain restriction is intentionally undocumented
- Files: `src/app/api/auth/signup/route.ts` (lines 20-32)
- Impact: UX confusion (users don't know why signup fails), violates principle of least surprise, makes it hard to onboard legitimate users if policy changes
- Fix approach: Document in UI signup form, or store domain restrictions in database (configurable)

**Permission Sync Relies on External API with Fallback to Stale Cache:**
- Issue: `src/lib/external-api.ts` and `src/app/api/auth/login/route.ts` (line 79) show that if external API is down, permissions fall back to cached values in `User.permissionsUpdatedAt`. No TTL enforcement or cache invalidation strategy
- Files: `src/lib/external-api.ts`, `src/app/api/auth/login/route.ts` (lines 67-82)
- Impact: Users with revoked permissions can still access if external API is down. Stale permissions remain indefinitely
- Fix approach: Add TTL to cache (e.g., 24h), explicitly check `permissionsUpdatedAt` age before allowing access, implement cache invalidation endpoint

---

## Known Bugs

**Workspace Assignment/Video Data Race (Partially Fixed):**
- Symptoms: Video data sometimes loads but assignment status is stale or missing; VideoPlayer loads without video sourceUrls
- Files: `src/app/workspace/page.tsx` (lines 160-198), referenced in ASSIGNMENT_MISMATCH_FIX.md
- Trigger: Rapidly navigate between videos, or assignment status changes while user is in workspace
- Current status: 100ms delay added in `AssignmentModal.tsx` + cache-busting in `VideoGrid.tsx`. May still race if database write is slow
- Remaining risk: No explicit transaction checking assignment status is committed before workspace fetches

**Timestamp Sync Broken on Camera Switch (Complex State):**
- Symptoms: When switching cameras, video timestamp does not follow active camera; user creates event at wrong timestamp on secondary camera
- Files: `src/components/workspace/VideoPlayer.tsx` (lines 319-487) - Large CAMERA SWITCH + TIMESTAMP SYNC DEBUG block with manual ref syncing
- Trigger: Switch between CAM 1/2/3 while video is playing
- Workaround: Code preloads all camera refs and manually syncs `previousCamRef`, `wasPlayingRef`, `previousTimeRef`. Complex and brittle
- Risk: If refs don't stay in sync, camera timestamps will diverge further

**Assignment Creation Deletes Existing Assignments Silently:**
- Symptoms: If a video is reassigned from User A to User B, User A's assignment vanishes with no notification
- Files: `src/app/api/videos/[id]/assign/route.ts` (lines 50-68)
- Trigger: Admin reassigns a video that's already assigned
- Impact: User A loses work context, events may become orphaned, no audit trail
- Workaround: Code caches `videoTitle`, `userEmail`, `username` in assignment for visibility. But events are NOT cascaded (left dangling)

---

## Security Considerations

**Auth Token Stored in HttpOnly Cookie (Good), but No CSRF Protection:**
- Risk: POST/PUT/DELETE routes do not validate CSRF tokens. Next.js CSRF is not explicitly configured
- Files: All API routes that modify data (`src/app/api/videos/[id]/assign/route.ts`, `src/app/api/videos/[id]/events/route.ts`, etc.)
- Current mitigation: HttpOnly cookie + SameSite (implicit from Next.js), but no explicit CSRF header validation
- Recommendations: Add explicit CSRF token validation, or ensure all state-changing endpoints use POST with body (avoid GET)

**External API Key Sent in Production (Unencrypted):**
- Risk: `EXTERNAL_API_KEY` is read from environment variable and used in headers as `Authorization: Bearer {KEY}` in `src/lib/external-api.ts` (lines 36, 71, 102, 137)
- Files: `src/lib/external-api.ts`, `.env` (not readable, but referenced)
- Impact: If server logs are captured (e.g., via browser DevTools Network tab), API key is visible
- Current mitigation: Key is in environment variable, not hardcoded. Logs do print API key presence but not value
- Recommendations: Never log API calls with Authorization header, use proxy pattern (server-to-server only)

**Domain Restriction (@boxraw.com) Can Be Bypassed by Signup Form Interception:**
- Risk: Validation only happens on server. Client-side signup form (`src/components/auth/SignupForm.tsx`) does not validate domain, only server does
- Files: `src/app/api/auth/signup/route.ts` (lines 20-32), `src/components/auth/SignupForm.tsx`
- Impact: User might be confused about why signup fails after submitting non-@boxraw.com email
- Recommendations: Add client-side email domain validation in signup form, show clear message before submission

**Permissions Check Not Enforced Uniformly:**
- Risk: Some routes check `session.userId` but don't verify `accountType` or external permissions. E.g., workspace allows any authenticated user to access any assignment
- Files: `src/app/workspace/page.tsx` (lines 488-522 show PERMISSIONS DEBUG but don't seem to enforce blocks), `src/app/api/videos/[id]/events/route.ts` (no role check)
- Impact: A LABELER assigned to Video A could craft URL to Video B and access/edit events if no assignment lookup is enforced
- Recommendations: Add explicit permission checks: verify user owns the assignment, or has QC/ADMIN role

---

## Performance Bottlenecks

**VideoPlayer Component is 1191 Lines (Very Large, Complex):**
- Problem: `src/components/workspace/VideoPlayer.tsx` handles play state, volume, playback rate, zoom/pan, camera preloading, timestamp sync, loading state for 3 cameras. ~1200 lines of UI + event handlers
- Files: `src/components/workspace/VideoPlayer.tsx`
- Cause: All video control logic in one component. Multiple refs (cam1Ref, cam2Ref, cam3Ref) and useEffect hooks managing state
- Improvement path: Extract zoom/pan to custom hook, extract playback controls to separate component, use Context for video metadata instead of prop drilling
- Risk: Adding new camera features (e.g., picture-in-picture) or fixing bugs is risky due to size and interdependencies

**Workspace Page is 1212 Lines (Monolithic):**
- Problem: `src/app/workspace/page.tsx` manages events, assignments, form state, permissions, video data, QC mode, event submission, sidebar width. ~1200 lines in one component
- Files: `src/app/workspace/page.tsx`
- Cause: Centralized state lifted from child components, multiple useEffect hooks for data fetching and side effects
- Improvement path: Extract EventForm state to custom hook, extract QC review logic to separate component, use Context for assignment data
- Risk: Editing this file requires understanding full data flow; easy to introduce bugs when refactoring

**External API Fetches ALL Accounts to Look Up One User (N+1 Pattern):**
- Problem: `src/lib/external-api.ts` `getExternalAccountByEmail()` (lines 124-150) fetches `/accounts` endpoint to get all accounts, then filters in memory for email match
- Files: `src/lib/external-api.ts` (lines 124-150), called from `src/app/api/auth/login/route.ts` (line 29) and `src/app/api/auth/signup/route.ts` (line 68)
- Cause: External API likely doesn't expose `/accounts/{email}` endpoint, only `/accounts/{username}`
- Improvement path: Request external API add `/accounts?email={email}` query param, or cache account list with TTL
- Impact: Every login/signup does full account list download; scales poorly as user count grows

**Event Deletion and Recreation on Every Save (No Upsert):**
- Problem: `src/app/api/videos/[id]/events/route.ts` (lines 74-77) deletes all events then recreates. If there are 100 events, this does 100 deletes + 100 inserts
- Files: `src/app/api/videos/[id]/events/route.ts`
- Cause: No unique constraint on events by external ID; simpler to nuke-and-recreate than upsert
- Improvement path: Add `externalId` field to Event model, implement upsert logic, or use bulk replace operation
- Impact: Slow for large event lists, database churn, potential lock contention

---

## Fragile Areas

**Event Log Component (354 Lines) - Tightly Coupled to Event Shape:**
- Files: `src/components/workspace/EventLog.tsx`
- Why fragile: Renders event fields directly. If Event model schema changes, rendering breaks. No validation of event shape before render
- Safe modification: Use TypeScript interfaces strictly, add defensive checks (`event?.boxer || 'N/A'`), extract event rendering to separate component
- Test coverage: No tests. If event field is optional but code assumes it exists, crashes at runtime

**Camera Preloading Logic - Multiple Refs Managed Manually:**
- Files: `src/components/workspace/VideoPlayer.tsx` (refs: cam1Ref, cam2Ref, cam3Ref, videoRef)
- Why fragile: Manually syncing refs to parent's videoRef (line 95 with @ts-ignore). If parent component refactors, parent ref might become null
- Safe modification: Use Refs Context or forwardRef pattern, validate before syncing
- Test coverage: No tests. Refs can become out-of-sync if React component tree is refactored

**Video Assignment Deletion Cascade - Events Left Orphaned:**
- Files: `src/app/api/videos/[id]/assign/route.ts` (lines 50-68), `prisma/schema.prisma` (lines 131-132 shows onDelete: Cascade)
- Why fragile: When old assignment is deleted and new one created, events on old assignment are NOT deleted (only assignment is deleted). Events remain in DB but assignment doesn't exist
- Safe modification: Add explicit event deletion before assignment deletion, or update events to new assignment ID
- Test coverage: No tests. Running export after reassignment includes orphaned events with broken assignment references

**SidebarControls - Concurrent Save and Submit (Race Condition):**
- Files: `src/components/workspace/SidebarControls.tsx`
- Why fragile: User might click "Save" and "Submit" rapidly. If save is slow, submit might send old event data
- Safe modification: Disable submit button while saving, queue operations, use request deduplication
- Test coverage: No tests. Load testing would reveal this

---

## Scaling Limits

**Single Database Write for All Events (No Batching):**
- Current capacity: Works for ~100 events per assignment. Beyond that, createMany might timeout or hit connection pool limits
- Limit: Prisma createMany default batch size is 100. For 10K events, query might exceed request timeout (default 30s) or hit PostgreSQL statement size limits
- Scaling path: Batch events in chunks of 100, implement stream-based import, or add background job queue for large exports

**External API Fetch All Accounts (No Pagination):**
- Current capacity: Works for <1000 accounts. If external API has 10K+ users, fetch becomes slow
- Limit: Fetch response size grows, parsing time increases, memory overhead
- Scaling path: Implement cursor-based pagination, add caching with TTL, or switch to username-based lookup if possible

**Cache-Busting with Timestamp Query Params (No Cache at All):**
- Current capacity: Each request is fresh from database. No caching layer means every dashboard load hits database
- Limit: If 100+ concurrent users are on dashboard, database becomes bottleneck
- Scaling path: Add Redis cache with smart invalidation, use Next.js ISR (incremental static regeneration) for video list, implement ETags

---

## Dependencies at Risk

**Prisma 6.19.0 - Major Version (Potential Breaking Changes):**
- Risk: Prisma 6.x has breaking changes from 5.x. Unknown if codebase is tested against 6.x fully
- Impact: Query performance, schema generation, type safety changes
- Migration plan: Add test suite to verify Prisma behavior, lock version in package.json, plan migration path to future versions

**bcryptjs - Unmaintained? Check for Vulnerabilities:**
- Risk: bcryptjs is mature but less commonly maintained. Depends on wasm bindings which can have vulnerabilities
- Impact: If vulnerability found in bcryptjs, password hashing might be compromised
- Migration plan: Monitor GitHub advisories, consider migrating to `argon2` (better algorithm) or use Node's built-in `crypto.pbkdf2`

**TUS Resumable Upload Library - Potential Stalled Upload Edge Cases:**
- Risk: Custom resumable upload logic in `src/lib/storage/resumable-upload.ts` (245 lines) manually manages chunks. If chunk upload fails, does it retry?
- Impact: Large videos might fail mid-upload with no recovery, users lose work
- Migration plan: Validate chunk retry logic, add exponential backoff, test with network throttling

---

## Missing Critical Features

**No End-to-End Tests:**
- Problem: No test files in `src/`. Zero coverage for critical flows (login, upload, assign, submit, export)
- Blocks: Can't safely refactor large components (VideoPlayer, Workspace), can't catch regressions before deploy
- Recommendations: Add Playwright tests for login → assign → workspace → submit flow, add unit tests for permission checking, add API tests for event submission

**No Error Boundaries for Critical Components:**
- Problem: If VideoPlayer crashes, entire workspace is broken. No error boundary wrapping video playback
- Blocks: A single render error brings down the UI
- Recommendations: Add ErrorBoundary wrapper in `src/app/workspace/layout.tsx`, add try-catch in video event handlers

**No Request Timeout or Retry Logic:**
- Problem: Long-running operations (external API fetch, event save) have no timeout or retry. If external API hangs, user is stuck
- Blocks: Reliability degrades if huemanapi.com is slow
- Recommendations: Add fetch timeout (3s), implement exponential backoff retry, add circuit breaker for external API

**No Audit Logging:**
- Problem: When events are edited, deleted, or reassigned, there's no record of who changed what. No compliance trail
- Blocks: Can't debug data integrity issues, can't prove who labeled events for legal disputes
- Recommendations: Add audit log table, log all mutations with user ID and timestamp, allow admins to view history

---

## Test Coverage Gaps

**No Tests for Event Submission Flow:**
- What's not tested: User creates 10 events, clicks submit, events are marked SUBMITTED, assignment status changes
- Files: `src/app/workspace/page.tsx` (submit logic around line 950+), `src/app/api/videos/[id]/status/route.ts`
- Risk: Submit might fail silently, events not saved, assignment state stays ASSIGNED. User thinks they submitted but didn't
- Priority: HIGH (core user flow)

**No Tests for Permission Sync After Login:**
- What's not tested: User logs in, external API returns permissions, permissions are cached, user can access features
- Files: `src/app/api/auth/login/route.ts`, `src/lib/external-api.ts`
- Risk: Permissions might not be cached, user denied access incorrectly, or stale permissions allow invalid access
- Priority: HIGH (security-critical)

**No Tests for Workspace Camera Switching:**
- What's not tested: User switches between CAM 1/2/3, video timestamps stay in sync, events use correct camera
- Files: `src/components/workspace/VideoPlayer.tsx` (camera switch logic)
- Risk: Camera timestamps diverge, events labeled on wrong camera, data integrity broken
- Priority: MEDIUM (data quality)

**No Tests for Video Upload with Multiple Cameras:**
- What's not tested: User uploads 3-camera fight video, all URLs stored, workspace shows all 3 cameras
- Files: `src/app/upload/page.tsx`, `src/app/api/videos/finalize/route.ts`
- Risk: Missing camera URL, workspace shows blank player, user can't label
- Priority: MEDIUM (feature completeness)

**No Tests for Assignment Reassignment (Old → New User):**
- What's not tested: Video assigned to User A, admin reassigns to User B, old assignment deleted, User A no longer sees video
- Files: `src/app/api/videos/[id]/assign/route.ts`
- Risk: User A still sees old assignment in dashboard, events get confused, data becomes corrupted
- Priority: MEDIUM (data consistency)

**No Tests for Export with Date Range:**
- What's not tested: Admin exports events from 2026-01-01 to 2026-04-30, receives only events in that range, CSV format is valid
- Files: `src/app/api/admin/export-events/route.ts`
- Risk: Export includes wrong dates, CSV headers wrong, admins get bad data for analysis
- Priority: LOW (admin feature)

---

## Known Workarounds

**"@ts-ignore" in VideoPlayer Ref Sync (Line 94):**
- Location: `src/components/workspace/VideoPlayer.tsx` line 95
- Reason: TypeScript can't infer that active video ref matches parent's ref type
- Workaround: Type assertion bypass, unsafe but functional
- Fix: Use forwardRef pattern or move active video ref to parent

**100ms Delay in AssignmentModal (Race Condition Prevention):**
- Location: `src/components/AssignmentModal.tsx` (referenced in ASSIGNMENT_MISMATCH_FIX.md)
- Reason: Database transaction might not be committed immediately. Delay ensures commit before refresh
- Workaround: Hardcoded 100ms timeout, not ideal
- Fix: Implement explicit commit confirmation or use polling with exponential backoff

**Console.log for Debugging Instead of Structured Logging:**
- Location: Throughout codebase (see extensive grep output above)
- Reason: Quick debugging, no logging infrastructure set up
- Workaround: Environment-gated console calls with emoji prefixes
- Fix: Implement structured logging (pino, winston, or Vercel edge function logs)

**Cache-Busting with Timestamp Query Params (`?_t={Date.now()}`):**
- Location: `src/components/VideoGrid.tsx` (referenced in ASSIGNMENT_MISMATCH_FIX.md)
- Reason: Browser cache interferes with assignment updates. Query param forces cache miss
- Workaround: Every request is uncached, zero caching benefit
- Fix: Implement proper cache headers + invalidation strategy, or use SWR/TanStack Query

---

*Concerns audit: 2026-04-30*
