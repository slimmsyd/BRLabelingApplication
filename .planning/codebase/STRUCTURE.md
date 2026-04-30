# Codebase Structure

**Analysis Date:** 2026-04-30

## Directory Layout

```
LabelingApp/                           # Repo root
├── my-app/                            # Next.js app (primary deliverable)
│   ├── src/
│   │   ├── app/                       # Next.js App Router pages & API routes
│   │   ├── components/                # Reusable React components
│   │   ├── lib/                       # Shared utilities & integrations
│   │   └── types/                     # Shared TypeScript interfaces
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema
│   │   └── migrations/                # Database migrations (auto-generated)
│   ├── public/                        # Static assets (favicons, images)
│   ├── scripts/                       # Build scripts (icon generation)
│   ├── package.json                   # Dependencies & build commands
│   ├── next.config.ts                 # Next.js config (500MB upload limit)
│   ├── tsconfig.json                  # TypeScript config
│   └── .next/                         # Build output (git-ignored)
│
├── Python/                            # Data processing scripts (not core app)
│   ├── scripts/                       # Python utilities for data prep
│   └── venv/                          # Virtual environment (git-ignored)
│
├── .planning/                         # GSD planning docs
│   └── codebase/                      # Architecture & implementation guides
│
└── README.md, .gitignore, etc.
```

## Directory Purposes

**my-app/src/app:**
- Purpose: Next.js App Router structure (pages and API routes)
- Format: Segment-based directory tree (Next.js 13+ convention)
- Key files:
  - `page.tsx`: Root dashboard
  - `layout.tsx`: Root layout with metadata & fonts
  - `login/page.tsx`: Login page
  - `workspace/[assignmentId]/page.tsx`: Video annotation workspace
  - `upload/page.tsx`: Video upload page
  - `settings/page.tsx`: User settings
  - `test-upload/page.tsx`: Development test upload page

**my-app/src/app/api:**
- Purpose: RESTful backend API routes
- Subfolders:
  - `auth/` - Authentication endpoints (login, signup, logout, /me)
  - `videos/` - Video CRUD and assignment operations
  - `videos/[id]/` - Video-specific operations (assign, unassign, events, status)
  - `admin/` - Admin-only operations (export, migrate, settings)
  - `external/` - Proxy routes to huemanapi.com (fights, accounts, rounds)
  - `export/` - Data export endpoints (events, titles CSV/JSON)
  - `debug/` - Development testing endpoints
  - `users/` - User management endpoints
- Pattern: Each endpoint is `route.ts` exporting `GET`, `POST`, etc.

**my-app/src/components:**
- Purpose: Reusable React components
- Top-level components (page-level):
  - `Sidebar.tsx` - Main navigation sidebar with user profile & role badges
  - `VideoGrid.tsx` - Dashboard video grid with filters
  - `HeroSection.tsx` - Dashboard hero/welcome section
  - `VideoCard.tsx` - Individual video card in grid
  - `AssignmentModal.tsx` - Modal for assigning videos to users
  - `ExportReportsSection.tsx` - Admin export UI
  - `ClipExportPanel.tsx` - Clip/segment export UI
  - `SuccessModal.tsx` - Success notification modal
- Subdirectories:
  - `auth/` - Login and signup forms
  - `workspace/` - Workspace-specific components:
    - `VideoPlayer.tsx` - Main annotation interface (55KB)
    - `SidebarControls.tsx` - Event creation & editing controls
    - `EventLog.tsx` - Event list and details view
    - `WorkspaceHeader.tsx` - Workspace top bar with metadata

**my-app/src/lib:**
- Purpose: Shared utilities and business logic
- Key files:
  - `prisma.ts` - Prisma singleton client
  - `session.ts` - JWT session creation/verification
  - `external-api.ts` - huemanapi.com integration (user permissions, accounts)
  - `aws.ts` - AWS S3 & DynamoDB clients and helper functions
  - `video-helpers.ts` - Video title generation, date formatting
  - `client-utils.ts` - Client-side utilities
- Subdirectory `storage/`:
  - `types.ts` - `StorageProvider` interface
  - `supabase-provider.ts` - Supabase Storage implementation
  - `s3-provider.ts` - AWS S3 implementation (stubbed)
  - `resumable-upload.ts` - TUS resumable upload implementation
  - `index.ts` - Storage provider factory/exports
  - Other upload strategies (test, direct, standard, client upload)

**my-app/src/types:**
- Purpose: Shared TypeScript types and interfaces
- Organized by domain (user, video, event, etc.)

**my-app/prisma:**
- `schema.prisma` - Prisma ORM schema (models: User, Video, VideoAssignment, Event)
- `migrations/` - Auto-generated SQL migrations (not hand-edited)

**my-app/public:**
- Favicons, app icons, logo images
- Served as static assets under `/` route

**my-app/scripts:**
- `generate-icons.sh` - Build script for icon generation

**Python/:**
- Data processing scripts (outside scope of Next.js app)
- One-line note: Contains utility scripts for video metadata processing & batch uploads (not executed by Next.js app)

## Key File Locations

**Entry Points:**
- `my-app/src/app/page.tsx` - Dashboard (home page)
- `my-app/src/app/login/page.tsx` - Login page
- `my-app/src/app/workspace/[assignmentId]/page.tsx` - Video annotation
- `my-app/src/app/upload/page.tsx` - Video upload

**Configuration:**
- `my-app/package.json` - Dependencies and build scripts
- `my-app/next.config.ts` - Next.js config
- `my-app/tsconfig.json` - TypeScript settings
- `my-app/prisma/schema.prisma` - Database schema

**Core Logic:**
- `my-app/src/lib/prisma.ts` - Database client
- `my-app/src/lib/session.ts` - Authentication logic
- `my-app/src/lib/external-api.ts` - External API integration
- `my-app/src/lib/aws.ts` - AWS service clients
- `my-app/src/app/api/auth/*` - Auth endpoints
- `my-app/src/app/api/videos/*` - Video/assignment endpoints

**UI Components:**
- `my-app/src/components/workspace/VideoPlayer.tsx` - Main annotation interface
- `my-app/src/components/VideoGrid.tsx` - Dashboard grid
- `my-app/src/components/Sidebar.tsx` - Navigation

**Storage:**
- `my-app/src/lib/storage/supabase-provider.ts` - Supabase integration
- `my-app/src/lib/storage/s3-provider.ts` - AWS S3 (stubbed)

## Naming Conventions

**Files:**
- Pages: `page.tsx` (Next.js convention)
- API routes: `route.ts` (Next.js convention)
- Components: PascalCase with `.tsx` (e.g., `VideoPlayer.tsx`, `Sidebar.tsx`)
- Utilities/libraries: camelCase with `.ts` (e.g., `session.ts`, `video-helpers.ts`)
- Directories: kebab-case for app segments (e.g., `[assignmentId]`, `test-upload`)
- Directories: camelCase for component subdirs (e.g., `workspace`, `auth`)

**Functions:**
- API handlers: `POST`, `GET`, `PUT`, `DELETE` (HTTP verbs)
- Utilities: camelCase (e.g., `getSession()`, `createSession()`, `getExternalAccountByEmail()`)

**Variables:**
- PascalCase for React components and classes (e.g., `VideoPlayer`, `SupabaseStorageProvider`)
- camelCase for constants/functions (e.g., `JWT_SECRET`, `s3Client`)

**Types:**
- PascalCase with `Request`/`Response` suffix (e.g., `FinalizeRequest`, `PermissionResponse`)
- Enums: PascalCase (e.g., `AccountType`, `VideoStatus`, `LabelType`)
- Interfaces: `Interface` prefix or descriptive (e.g., `SessionPayload`, `StorageProvider`)

## Where to Add New Code

**New Feature (e.g., export events as PDF):**
- Primary code: `my-app/src/app/api/export/[format]/route.ts` (new endpoint)
- UI: `my-app/src/components/ExportReportsSection.tsx` (add button/form)
- Business logic: `my-app/src/lib/export-helpers.ts` (new utility file if reusable)
- Tests: Not currently used in codebase (create `__tests__/` adjacent to source)

**New Component/Module (e.g., EventFilter):**
- Implementation: `my-app/src/components/workspace/EventFilter.tsx` (or top-level if general)
- If workspace-specific: `my-app/src/components/workspace/EventFilter.tsx`
- If general (used across pages): `my-app/src/components/EventFilter.tsx`
- Type definitions: Add to `my-app/src/types/` if complex, else inline in component

**New API Endpoint (e.g., batch assign videos):**
- Location: `my-app/src/app/api/videos/batch-assign/route.ts`
- Business logic: Extract to `my-app/src/lib/video-operations.ts` if shared with UI
- Database ops: Use `prisma` from `my-app/src/lib/prisma.ts`

**Utilities/Helpers:**
- Shared across routes/components: `my-app/src/lib/[domain]-helpers.ts`
- E.g., `video-helpers.ts`, `date-helpers.ts`, `export-helpers.ts`
- Client-only utils: `my-app/src/lib/client-utils.ts`

**Storage/File Operations:**
- New storage provider: Implement `StorageProvider` interface in `my-app/src/lib/storage/[provider]-provider.ts`
- Upload strategies: New file in `my-app/src/lib/storage/[strategy]-upload.ts`

## Special Directories

**my-app/.next:**
- Purpose: Next.js build output (generated)
- Committed: No (in .gitignore)
- Contains: Built pages, chunks, static assets after `npm run build`

**my-app/node_modules:**
- Purpose: Installed dependencies
- Committed: No (in .gitignore)
- Generated: By `npm install` from `package.json` & `package-lock.json`

**prisma/migrations:**
- Purpose: Database schema version history
- Committed: Yes (required for prod deployments)
- Generated: Auto-created by `prisma migrate` commands
- Do not edit by hand (use Prisma CLI)

**Python/venv:**
- Purpose: Python virtual environment
- Committed: No (in .gitignore)

**public/:**
- Purpose: Static assets served at root (`/` path)
- Committed: Yes
- Examples: favicons, logo, app icons

---

*Structure analysis: 2026-04-30*
