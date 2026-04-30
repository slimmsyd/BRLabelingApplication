# Testing Patterns

**Analysis Date:** 2026-04-30

## Test Framework & Coverage Status

**Current State:** No formal test suite exists

This project does not use Jest, Vitest, or other automated testing frameworks. There are:
- **No test files** in `src/` (no `*.test.ts`, `*.spec.ts`, or `__tests__/` directories)
- **No test runner** configured in `package.json` (no `test` script)
- **No test dependencies** in dev dependencies

**Status:** Testing relies entirely on manual testing and utility scripts (see below).

## Informal Testing Strategy

### Manual Test Scripts

Instead of formal unit/integration tests, the project includes **31 utility scripts** in `my-app/scripts/` that serve as ad-hoc test harnesses and validation tools.

**Script Types:**

**1. API Integration Tests**
- `test-external-api.ts` - Test external boxing API (POST/PUT behavior)
- `test-get-fight.ts` - Test GET requests to external fight database
- `test-put-request.ts` - Test PUT requests to external API

Example usage:
```bash
npx tsx scripts/test-external-api.ts
```

These scripts:
- Define test payloads inline
- Make actual HTTP requests to external systems
- Log results with visual indicators (✅/❌)
- Return success/failure status

**2. Data Validation & Backfill**
- `validate-qc-data.ts` - Validate QC changes and quality
- `backfill-data.ts` - Populate database with test/missing data
- `backfill-external-api.ts` - Sync data from external systems
- `count-missing-attribution.ts` - Find incomplete records

**3. Database Inspection**
- `check-assignment.ts` - Verify assignment states
- `check-nakatani-videos.ts` - Validate specific video records
- `check-storage-limits.ts` - Monitor storage usage

**4. Data Export/Analysis**
- `export-events-by-date.ts` - Export events for analysis
- `export-dan-qc-changes.ts` - Export specific QC changes
- `rename-storage-paths.ts` - Batch rename storage paths

**Running Scripts:**

```bash
# Run any script with:
npx tsx scripts/[script-name].ts

# Scripts often accept CLI arguments or read from environment variables
# Check script headers for usage patterns
```

### Manual Testing Workflow

**Client-Side Testing:**
1. Start dev server: `npm run dev`
2. Navigate to localhost:3000
3. Test workflows manually:
   - Login flow (auth/login/route.ts)
   - Video upload (app/upload/page.tsx)
   - Video labeling (workspace/page.tsx)
   - Admin exports (settings/page.tsx with ExportReportsSection)

**API Testing:**
1. Use scripts in `my-app/scripts/` to test endpoints
2. Use browser DevTools Network tab to inspect requests/responses
3. Check server logs (`console.log` statements prefixed with `[API]`)

**Database Testing:**
1. Use Prisma Studio: `npx prisma studio`
2. Inspect tables directly
3. Run backfill/validation scripts to check state

## Test Data Sources

**Fixtures:**
- No dedicated fixture files
- Scripts embed test data inline (see `test-external-api.ts`)
- External system provides real data for integration testing

**Test Payloads (Example from test-external-api.ts):**
```typescript
const testPayload = {
  fight_title: 'TEST_API_Connection',
  RD1: {
    Cam1: [{
      eventType: 'punch',
      fighter: 'boxer1',
      startTime: 10.5,
      hand: 'left',
      punchType: 'Jab',
      // ... other fields
    }]
  },
  metadata: { venue: 'Test Venue', date: '2026-01-12' },
  submittedBy: { userId: 'test-user-id', email: 'test@boxraw.com' },
  isQCReview: false,
  isTest: true,
};
```

## Testing Patterns in Scripts

**Async Testing Pattern:**
```typescript
// From test-external-api.ts
async function testMethod(method: 'POST' | 'PUT') {
  console.log(`\n🧪 Testing ${method}...`);
  
  try {
    const response = await fetch(url, { method, ... });
    console.log(`   Status: ${response.status}`);
    
    if (response.ok) {
      console.log(`   ✅ ${method} succeeded!`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ ${method} error: ${error}`);
    return false;
  }
}

async function main() {
  const postOk = await testMethod('POST');
  const putOk = await testMethod('PUT');
  console.log(`POST: ${postOk ? '✅' : '❌'}`);
  console.log(`PUT: ${putOk ? '✅' : '❌'}`);
}

main();
```

**Data Inspection Pattern:**
```typescript
// From check-assignment.ts
// Query database to verify state
const assignment = await prisma.assignment.findUnique({
  where: { id: 'xxx' },
  include: { video: true, user: true }
});
console.log('Assignment status:', assignment?.status);
console.log('Assigned to:', assignment?.user?.email);
```

## Mocking

**Current Approach:** No mocking framework (no jest.mock, vitest mocks, etc.)

**What's tested live:**
- External APIs (real HTTP requests in test scripts)
- Database (real Prisma queries against dev database)
- File storage (real S3/Supabase operations)

**Safe mocking options for future tests:**
- Use Vitest with `vi.mock()` for module mocking
- Use MSW (Mock Service Worker) for HTTP mocking if formal test suite is added

## Client-Side Testing

**Error Boundaries:**
- Test pages manually by triggering errors
- `src/app/error.tsx` logs to console and displays error UI
- Verify error recovery with "Try Again" button

**localStorage Testing (in client-utils.ts):**
All localStorage access wrapped in try-catch for safety:
```typescript
export function safeGetItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}
```
Test this manually by:
1. Blocking localStorage in DevTools
2. Verifying app doesn't crash
3. Checking console for error logs

**Component State Testing:**
- Manual: interact with forms, buttons, state updates
- Verify state updates trigger re-renders correctly
- Example: ExportReportsSection.tsx has multiple independent state sections (All Events, QC, Round)
  - Test each section's date picker, timezone selector, and export button independently

## Integration Testing

**Typical Flow (Video Upload → Labeling → Export):**

1. **Upload:**
   - Use `app/upload/page.tsx` UI
   - Upload 1-3 video files
   - Verify videos appear in `/api/videos` (GET)

2. **Assignment:**
   - Admin assigns video to labeler
   - Verify assignment created via Prisma Studio
   - Verify labeler can view in workspace

3. **Labeling:**
   - Labeler opens `workspace/page.tsx`
   - Creates events by filling form and submitting
   - Verify events saved to database

4. **Export:**
   - Admin navigates to settings
   - Uses ExportReportsSection to export by date range
   - Verify CSV contains correct events

**Run Manually:**
```bash
npm run dev
# Navigate through UI manually following steps above
```

## API Route Testing

**Pattern (test external API in scripts):**

```typescript
// scripts/test-external-api.ts
const response = await fetch('https://www.huemanAPI.com/boxing_fight', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testPayload),
});

if (response.ok) {
  console.log('✅ POST succeeded!');
} else {
  console.log(`❌ POST failed with ${response.status}`);
}
```

**Testing Local API Routes:**
1. Start dev server: `npm run dev`
2. Use curl, Postman, or fetch in browser console:
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@test.com","password":"pass123"}'
   ```
3. Check response status and body
4. Verify database state changed with Prisma Studio

**Key Routes to Test:**
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/signup` - Register new user
- `GET /api/videos` - Fetch all videos
- `POST /api/videos/[id]/assignments` - Assign video
- `DELETE /api/videos/[id]/unassign` - Remove assignment
- `POST /api/assignments/[id]/submit` - Submit labeling assignment
- `GET /api/admin/export-events` - Export events by date
- `GET /api/admin/export-events/round` - Export single round

## Coverage Approach

**Requirements:** No enforced coverage targets

**Current State:**
- Critical paths covered by manual testing + scripts
- Auth flows manually tested
- API responses logged and inspected via console
- Database state verified with Prisma Studio

**When to Add Formal Tests:**
1. If critical bugs slip through manual testing
2. Before major refactors of core logic (video validation, event processing)
3. For external API integrations (easier to mock than test manually)
4. For accessibility/cross-browser testing (needs headless runner)

## Testing Recommendations

**For New Features:**

1. **Small changes:** Manual testing sufficient
   - Test in browser
   - Verify database state in Prisma Studio
   - Check server logs

2. **API integration:** Use scripts pattern
   - Create `scripts/test-[feature].ts`
   - Define test payload
   - Make HTTP request and log results
   - Run with `npx tsx scripts/test-[feature].ts`

3. **Complex logic:** Consider unit tests
   - Video validation already has utilities (validateVideoFile, getVideoDuration)
   - Consider Vitest for these utilities
   - Mock File API with test helpers

4. **Before deployment:**
   - Run all manual test scripts
   - Test happy path in UI manually
   - Check error scenarios (invalid inputs, network failures)
   - Verify logs in console and server output

## Debugging & Diagnostics

**Console Logging Patterns (from codebase):**

Each module prefixes logs with context:
```
[Videos API] Fetching all videos...
[VideoCard] Assign clicked for video: { id, title }
[ROUND-EXPORT 3a9f2d] IN url=...
[ROUND-EXPORT 3a9f2d] LOOKUP video.id=...
[ROUND-EXPORT 3a9f2d] EVENTS count=42
[ROUND-EXPORT 3a9f2d] OUT filename="..." rows=42
```

Use these logs to:
- Trace request flow through API
- Verify data transformations
- Debug async operation timing

**Browser DevTools:**
- Network tab: inspect request/response bodies
- Console: see console.log output from page
- Application → LocalStorage: inspect client cache

**Prisma Studio:**
```bash
npx prisma studio
# Opens http://localhost:5555
# Browse all tables and query data
```

---

*Testing analysis: 2026-04-30*
