# External Integrations

**Analysis Date:** 2026-04-30

## APIs & External Services

**huemanapi.com (DEV's Centralized API):**
- Manages user permissions, accounts, and fight metadata
- SDK/Client: Fetch API (no SDK; direct HTTP calls)
- Auth: Bearer token via `EXTERNAL_API_KEY` env var
- Endpoints:
  - `GET /accounts` - Fetch all user accounts
  - `GET /accounts/{username}` - Get account by username (deprecated in favor of email)
  - `GET /fights` - List fights
  - `GET /fight/{title}` - Get fight details
  - `GET /fight/{title}/rounds` - Get round data for a fight
  - `GET /fight/{title}/round/{id}` - Get specific round details
  - `POST /accounts` - Create new user in external system
- Implementation: `src/lib/external-api.ts` (functions: `getExternalAccountByEmail`, `createExternalUser`, `getAllAccounts`)
- API Routes proxy endpoints to local API: `src/app/api/external/*`

## Data Storage

**Databases:**

**PostgreSQL (via Supabase):**
- Provider: Supabase (managed PostgreSQL)
- Connection: Via `DATABASE_URL` (standard) and `DIRECT_URL` (serverless edge)
- Client: Prisma ORM via `@prisma/client 6.19.0`
- Schema: `prisma/schema.prisma`
- Models: User, Video, VideoAssignment, Event
- Role: Primary data store for all app entities (users, video metadata, assignments, labeling events)

**DynamoDB (AWS - Optional):**
- Table: `VideoDataSource-main` (default, configurable via `DYNAMODB_VDS_TABLE`)
- Region: `us-east-1` (default, configurable via `AWS_REGION`)
- Client: `@aws-sdk/lib-dynamodb` (Document client)
- Purpose: Hybrid storage for video metadata (backup/sync point from Python scripts)
- Functions: `createVideoDataSource`, `getVideoDataSource`, `getVideoDataSourcesByDescription` (in `src/lib/aws.ts`)

**File Storage:**

**Supabase Storage:**
- Bucket: `fight-videos`
- Provider implementation: `src/lib/storage/supabase-provider.ts` (class `SupabaseStorageProvider`)
- Auth: Service role key `SUPABASE_SERVICE_ROLE_KEY`
- Purpose: Primary video file storage
- Methods: Upload, delete, get public URL
- Interface: Implements `StorageProvider` interface (`src/lib/storage/types.ts`)

**AWS S3 (Hybrid - Configured but Stubbed):**
- Bucket: `com.boxrawlabs.labelling-app-test-data.unsecured` (default, configurable via `S3_BUCKET`)
- CloudFront CDN: `https://do5dznmsu0r6j.cloudfront.net` (default, configurable via `CLOUDFRONT_URL`)
- Provider implementation: `src/lib/storage/s3-provider.ts` (class `S3StorageProvider` - NOT YET IMPLEMENTED)
- SDK: `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`
- Auth: AWS credentials via `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- Status: Stubbed with TODOs for presigned POST and progress tracking
- Intended use: Migrate to hybrid S3 + CloudFront for scalability

**Caching:**
- None detected (no Redis, Memcached)

## Authentication & Identity

**Auth Provider:**
- Custom JWT-based (no third-party auth provider)
- Library: `jose 6.1.3` (JWT creation/verification)
- Implementation: `src/lib/session.ts`
- Algorithm: HS256 (symmetric key signing)
- Secret: `JWT_SECRET` env var
- Token location: HttpOnly secure cookie named `session`
- Expiry: 7 days
- Payload: `{ userId, email, username }` + issued/expiration times

**Password Hashing:**
- Library: `bcryptjs 3.0.3`
- Used in: `src/app/api/auth/login/route.ts`, `src/app/api/auth/signup/route.ts`

**External Account Sync:**
- On login, fetches permissions from huemanapi.com and caches to local Postgres
- Field: `User.permissions` (JSON) and `User.permissionsUpdatedAt` (DateTime)
- Fallback: Uses cached permissions if external API unavailable

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Rollbar, DataDog)

**Logs:**
- Console logging throughout (console.log, console.error)
- Development: Query logs enabled in Prisma (see `src/lib/prisma.ts`)
- Production: Only error logs from Prisma

**Debug Endpoints:**
- `src/app/api/debug/external-api-test/route.ts` - Manual testing of external API connectivity

## CI/CD & Deployment

**Hosting:**
- Vercel (primary deployment target)
- Configuration: `next.config.ts` with 500MB server action body limit

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI, or similar)

**Build Commands:**
- `npm run build` - Next.js production build
- `npm run dev` - Development server (next dev)
- `npm start` - Production server (next start)

## Environment Configuration

**Required env vars:**
- `DATABASE_URL` - PostgreSQL connection string (with password)
- `DIRECT_URL` - PostgreSQL direct connection (for serverless)
- `JWT_SECRET` - Session signing key
- `EXTERNAL_API_URL` - huemanapi.com base URL (default: https://www.huemanapi.com)
- `EXTERNAL_API_KEY` - Bearer token for huemanapi.com
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role secret
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS credentials
- `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `S3_BUCKET` - S3 bucket name (default: com.boxrawlabs.labelling-app-test-data.unsecured)
- `CLOUDFRONT_URL` - CloudFront distribution domain (default: https://do5dznmsu0r6j.cloudfront.net)
- `DYNAMODB_VDS_TABLE` - DynamoDB table name (default: VideoDataSource-main)
- `NODE_ENV` - Development or production

**Secrets location:**
- `.env.local` (git-ignored)
- Vercel environment secrets panel (production)

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- POST to huemanapi.com `/accounts` endpoint (user creation webhook)

## Upload Pipeline

**Client-side resumable upload (TUS):**
- Library: `tus-js-client 4.3.1`
- Implementation: `src/lib/storage/resumable-upload.ts`
- Process:
  1. Client gets upload token from `/api/videos/get-upload-token`
  2. Client uploads to Supabase via TUS protocol with resumable chunks
  3. Client calls `/api/videos/finalize` with storage paths to create database record

**Video Processing:**
- Library: FFmpeg WASM (@ffmpeg/ffmpeg, @ffmpeg/core, @ffmpeg/util)
- Usage: Client-side video transcoding/analysis (not detailed in current scan)
- ZIP handling: `jszip` for batch downloads

---

*Integration audit: 2026-04-30*
