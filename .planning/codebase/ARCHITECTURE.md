# Architecture

**Analysis Date:** 2026-04-30

## Pattern Overview

**Overall:** Next.js 16 full-stack with clear separation between client/server, API routes as backend layer, Prisma ORM for data access, Supabase + AWS hybrid storage.

**Key Characteristics:**
- Client-side video upload with TUS resumable protocol (Supabase primary)
- Server-side JWT authentication with external permission sync (huemanapi.com)
- Video assignment state machine (ASSIGNED → IN_PROGRESS → SUBMITTED → REVIEWED → COMPLETED)
- Multi-role access control (LABELER, QUALITY_CONTROL, ADMIN)
- Event-based labeling system (punch/defense events tied to video assignments)
- Provider-agnostic storage abstraction (Supabase, S3, hybrid)

## Layers

**Presentation Layer (UI):**
- Location: `src/app/`, `src/components/`
- Contains: Page components (login, workspace, upload, settings) and reusable UI components
- Entry: `src/app/page.tsx` (dashboard with VideoGrid, Sidebar)
- State management: Local React state + fetch API for server communication
- Key components:
  - `src/components/VideoGrid.tsx` - Lists assigned videos
  - `src/components/workspace/VideoPlayer.tsx` - Video annotation interface (55KB)
  - `src/components/Sidebar.tsx` - Navigation, user profile, role badges
  - `src/components/auth/` - Login/signup forms
- Depends on: API routes via fetch, session cookie for auth

**API Layer (Backend):**
- Location: `src/app/api/`
- Contains: Route handlers for all operations
- Structure:
  - `auth/` - Login, signup, logout, /me (current user)
  - `videos/` - Fetch videos, list assigned, submit, finalize uploads, get upload tokens
  - `videos/[id]/` - Get/update video, assign/unassign, list events, update status
  - `admin/` - Export events, migrate data, admin-only operations
  - `external/` - Proxy to huemanapi.com (fights, accounts, rounds)
  - `export/` - CSV/JSON export endpoints
  - `debug/` - Testing endpoints for external API
- Depends on: Database layer (Prisma), storage providers, external APIs

**Database Layer:**
- Location: `src/lib/prisma.ts` (singleton client), `prisma/schema.prisma` (schema)
- Database: PostgreSQL via Supabase
- ORM: Prisma 6.19.0
- Models:
  - `User` - Accounts with local password + cached external permissions
  - `Video` - Fight videos with metadata (boxers, round, camera count, storage location)
  - `VideoAssignment` - Assignment of video to user for specific label type (OFFENSE/DEFENSE/FOOTWORK)
  - `Event` - Individual punch/defense events labeled within an assignment
- Key queries: See individual route handlers
- Depends on: PostgreSQL connection, Supabase credentials

**Storage Layer:**
- Location: `src/lib/storage/`
- Abstraction: `StorageProvider` interface (`src/lib/storage/types.ts`)
- Implementations:
  - `SupabaseStorageProvider` - Active, talks to Supabase Storage bucket
  - `S3StorageProvider` - Stubbed (TODO)
- Methods: `upload()`, `delete()`, `getPublicUrl()`, `exists()`, `getSignedUrl()`
- Providers integrated in: Video finalize route, admin operations
- Depends on: @supabase/supabase-js, @aws-sdk/* clients

**External Integration Layer:**
- Location: `src/lib/external-api.ts`, `src/app/api/external/`
- Purpose: Fetch user permissions, account data, fight metadata from huemanapi.com
- Functions: `getExternalAccountByEmail()`, `createExternalUser()`, `getAllAccounts()`, `getExternalAccount()`
- API proxying: Routes under `/api/external/*` forward requests to huemanapi.com with error handling
- Depends on: Fetch API, `EXTERNAL_API_URL` + `EXTERNAL_API_KEY` env vars

## Data Flow

**Authentication Flow:**
1. User enters email/password on `/login` page (`src/app/login/page.tsx`)
2. POST to `/api/auth/login` with credentials
3. Route finds `User` record, verifies bcrypt password
4. Fetches external account from huemanapi.com by email via `getExternalAccountByEmail()`
5. Caches permissions in `User.permissions` JSON field
6. Creates JWT via `createSession()` (jose library)
7. JWT stored as HttpOnly cookie `session` (7-day expiry)
8. Client redirected to `/` (dashboard)

**Video Assignment Lifecycle:**
1. ADMIN uploads video via `/upload` page
   - Client uses TUS resumable upload to Supabase Storage
   - Calls `/api/videos/finalize` with storage paths
   - Prisma creates `Video` record with metadata
2. ADMIN assigns video to LABELER via assignment modal
   - POST to `/api/videos/[id]/assign` with userId, labelType
   - Creates `VideoAssignment` with status ASSIGNED
3. LABELER picks up assignment (status → IN_PROGRESS)
4. LABELER annotates video, creates `Event` records in workspace
   - Each event tied to assignment via `assignmentId`
   - Event data: startTime, endTime, boxer, punchType, hand, target, etc.
5. LABELER submits assignment (status → SUBMITTED)
   - POST to `/api/videos/[id]/status` with status change
6. QUALITY_CONTROL reviews via `/workspace/[id]`
   - Can see events from `/api/videos/[id]/events`
   - Changes status to REVIEWED
7. ADMIN marks COMPLETED
   - Status → COMPLETED, assignment hidden from listing

**Event Labeling in Workspace:**
1. User navigates to `/workspace/[assignmentId]`
   - Component: `src/components/workspace/VideoPlayer.tsx` (55KB, main interface)
   - Sidebar controls: `src/components/workspace/SidebarControls.tsx` for event creation
   - Event log: `src/components/workspace/EventLog.tsx` displays all events
2. Video player (FFmpeg WASM) streams from Supabase/S3 URL
3. User creates event in sidebar form (punch/defense), specifies time range
4. Event saved to database via client-side mutation
5. Event log updates in real-time
6. On submit, assignment status changes to SUBMITTED

**Upload Flow (Video Upload):**
1. User navigates to `/upload` page
2. Selects video file(s), enters fight metadata (boxers, round, date, FPS, weight class)
3. Client calls `/api/videos/bucket-info` to get Supabase bucket details
4. Client gets upload token from `/api/videos/get-upload-token`
5. TUS client uploads file chunks directly to Supabase Storage (`src/lib/storage/resumable-upload.ts`)
6. On completion, client POSTs to `/api/videos/finalize` with:
   - Fight metadata (boxer1, boxer2, round, fightDate, etc.)
   - Storage paths (array for multi-camera)
7. Route verifies files exist in storage
8. Creates `Video` record in Prisma with:
   - `storagePath`: primary path
   - `storageProvider`: SUPABASE
   - `sourceUrls`: array of public URLs from `getPublicUrl()`
   - Fight metadata denormalized
9. Returns video ID to client (shown on dashboard)

## Key Abstractions

**StorageProvider:**
- Location: `src/lib/storage/types.ts`, implementations in same directory
- Purpose: Decouple storage backend (Supabase vs S3) from business logic
- Methods: `upload()`, `delete()`, `exists()`, `getPublicUrl()`, `getSignedUrl()`
- Used in: `/api/videos/finalize`, admin export functions
- Pattern: Interface-based polymorphism, instantiated per-request

**VideoDataSource (DynamoDB Model):**
- Location: `src/lib/aws.ts`
- Purpose: Backup/mirror of video metadata in DynamoDB (optional hybrid)
- Fields: Fight metadata, camera count, FPS, assignment tracking
- Not primary data store (Postgres is primary)

**SessionPayload (JWT):**
- Location: `src/lib/session.ts`
- Contents: `{ userId, email, username, iat, exp }`
- Used in: Auth guards, API route permission checks

**PermissionResponse (External API):**
- Location: `src/lib/external-api.ts`
- Fields: `username`, `email`, `accountType`, `permissions` (QC, Upload, ViewAssignments flags)
- Cached in: `User.permissions` JSON + timestamp in `User.permissionsUpdatedAt`

## Entry Points

**Web Application:**
- Location: `src/app/page.tsx` (dashboard)
- Triggers: User navigates to `/`
- Responsibilities:
  - Checks auth via `/api/auth/me`
  - Fetches all videos via `/api/videos`
  - Renders video grid with assignments
  - Guards with redirect to `/login` if not authenticated

**API Routes (Backend):**
- Format: `src/app/api/[feature]/[action]/route.ts`
- Each route exports `GET`, `POST`, `PUT`, `DELETE` as needed
- Accessed via HTTP from client (browser fetch) or server-to-server (SSR)

**Authentication Checkpoint:**
- `getSession()` called in any route requiring auth
- Returns `SessionPayload` or null if invalid cookie
- All protected routes check this before proceeding

## Error Handling

**Strategy:** Try-catch with HTTP status codes + console logging

**Patterns:**
- Routes wrap logic in try-catch, return NextResponse with status
- Missing fields → 400 Bad Request
- Not found → 404 Not Found
- Auth required → 401 Unauthorized or redirect to `/login`
- Conflicts (duplicate) → 409 Conflict
- Failures → 500 Internal Server Error with error message
- Console logs include emoji prefixes for readability (✅ ❌ ⚠️ 🔍)

## Cross-Cutting Concerns

**Logging:**
- Approach: console.log with emoji prefixes throughout
- Development: Prisma query logs enabled (`src/lib/prisma.ts`)
- Production: Only error logs

**Validation:**
- Request bodies parsed via `await req.json()`
- Type checking done in handler (interface assertions)
- Prisma schema enforces field requirements (non-nullable fields)
- No centralized validation library (Zod not used)

**Authentication:**
- JWT-based session cookie
- `getSession()` checks every protected route
- External permissions fetched on login, cached locally
- Fallback to cached permissions if external API unavailable

**Authorization:**
- Role-based: LABELER, QUALITY_CONTROL, ADMIN (stored in `User.accountType`)
- Permission flags: QC, Upload, ViewAssignments (from external API)
- Not enforced uniformly (some routes check role manually, others don't)

---

*Architecture analysis: 2026-04-30*
