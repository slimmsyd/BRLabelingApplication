# Technology Stack

**Analysis Date:** 2026-04-30

## Languages

**Primary:**
- TypeScript 5 - All source code, type-safe React components and API routes
- JavaScript (JSX/TSX) - React 19 components with Next.js App Router

**Secondary:**
- Python - Utility scripts in `/Python/scripts/` (not core app, see STRUCTURE.md)

## Runtime

**Environment:**
- Node.js (via Next.js 16)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.0.8 - Full-stack React framework, App Router, API routes, Server Components
- React 19.2.0 - UI component library and state management

**Frontend:**
- Tailwind CSS 4 - Utility-first CSS framework (@tailwindcss/postcss ^4)
- Lucide React 0.555.0 - Icon library

**Database:**
- Prisma 6.19.0 - ORM for PostgreSQL, client library, schema generation

**Testing:**
- Not detected (no Jest, Vitest, or Playwright in dependencies)

**Build/Dev:**
- Next.js built-in: ESLint 9, TypeScript compiler
- ESLint Config (Next.js) - Linting with eslint-config-next ^16.0.8

## Key Dependencies

**Critical:**
- @prisma/client 6.19.0 - Database ORM client
- @supabase/supabase-js 2.87.1 - Supabase Storage and Auth SDK
- jose 6.1.3 - JWT creation and verification (HS256 signing)
- bcryptjs 3.0.3 - Password hashing

**Video Processing:**
- @ffmpeg/ffmpeg 0.12.15 - WASM FFmpeg for client-side video processing
- @ffmpeg/core 0.12.10 - Core FFmpeg WASM bindings
- @ffmpeg/util 0.12.2 - FFmpeg utilities
- tus-js-client 4.3.1 - Resumable upload protocol (TUS)
- jszip 3.10.1 - ZIP archive handling

**Cloud/Storage:**
- @aws-sdk/client-s3 3.947.0 - S3 client for uploads
- @aws-sdk/client-dynamodb 3.947.0 - DynamoDB client
- @aws-sdk/lib-dynamodb 3.947.0 - DynamoDB Document client
- @aws-sdk/lib-storage 3.947.0 - High-level S3 upload manager

**UI/Forms:**
- react-datepicker 9.1.0 - Date picker component

**Type Definitions:**
- @types/node 20 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions
- @types/react-datepicker 6.2.0 - Date picker types
- @types/bcryptjs 2.4.6 - Bcrypt types

## Configuration

**Environment:**
- `.env.local` (not committed; contains secrets)
- Environment vars consumed: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `EXTERNAL_API_URL`, `EXTERNAL_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `CLOUDFRONT_URL`, `DYNAMODB_VDS_TABLE`, `NODE_ENV`

**Build:**
- `next.config.ts` - Next.js configuration (500MB server action body size limit, ignore TypeScript errors on build)
- `tsconfig.json` - TypeScript config (ES2017, strict mode, path aliases `@/*`)
- `prisma/schema.prisma` - Database schema (PostgreSQL with Supabase provider)

## Platform Requirements

**Development:**
- Node.js 18+ (inferred from Next.js 16 / React 19 compatibility)
- Supabase PostgreSQL database
- AWS credentials (optional, for hybrid S3 storage)

**Production:**
- Vercel (primary deployment target)
- Supabase PostgreSQL (primary data store)
- AWS S3 + CloudFront (optional hybrid storage)
- External API: huemanapi.com (for permissions/accounts)

---

*Stack analysis: 2026-04-30*
