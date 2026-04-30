# Coding Conventions

**Analysis Date:** 2026-04-30

## Naming Patterns

**Files:**
- **React Components:** PascalCase, one component per file (e.g., `VideoCard.tsx`, `ExportReportsSection.tsx`)
- **Utilities/Helpers:** camelCase (e.g., `video-helpers.ts`, `client-utils.ts`)
- **Types:** PascalCase in dedicated files (e.g., `video.ts` in `src/types/`)
- **API Routes:** kebab-case directories with `route.ts` files (e.g., `/api/admin/export-events/round/route.ts`)

**Functions:**
- camelCase for all function names
- Descriptive, action-oriented verbs (e.g., `generateStoragePath()`, `validateVideoFile()`, `handleRemoveAssignment()`)
- Handler functions prefixed with `handle` (e.g., `handleExport()`, `handleRoundExport()`)
- Async functions use `async`/`await` pattern consistently

**Variables:**
- camelCase for local variables and state
- State hooks use descriptive names (e.g., `const [selectedVideoId, setSelectedVideoId]`)
- Loading/error states explicitly named (e.g., `isLoading`, `error`, `qcLoading`, `qcError`)
- Boolean variables prefixed with `is` or use past tense (e.g., `isAdmin`, `showing`, `removing`)

**Types:**
- PascalCase for interfaces and types (e.g., `VideoCardProps`, `VideoUploadFormData`, `SessionPayload`)
- Descriptive suffixes: `Props` for component props, `Response` for API responses, `Request` for API payloads
- Exported from dedicated type files in `src/types/` (e.g., `src/types/video.ts`)

**Constants:**
- UPPER_SNAKE_CASE for hardcoded constants (e.g., `MAX_FILE_SIZE`, `VALID_FORMATS`, `TIMEZONES`)
- Defined at module level before function declarations

## Code Style

**Formatting:**
- ESLint + Next.js rules (see `eslint.config.mjs`)
- TypeScript strict mode enabled (`"strict": true`)
- JSX format: React 19 with `"jsx": "react-jsx"`

**Linting:**
- Framework: ESLint v9
- Config: `eslint.config.mjs` in flat config format
- Key disabled rules (development-friendly):
  - `@typescript-eslint/no-explicit-any`: Allows `any` type for flexibility
  - `@typescript-eslint/no-unused-vars`: Unused vars allowed during development
  - `@typescript-eslint/ban-ts-comment`: Allows `@ts-ignore` comments
  - `@next/next/no-img-element`: Allows `<img>` tags (not forcing Next Image)
  - `no-console`: Console logging allowed for debugging

**Indentation:**
- 2 spaces (standard Next.js convention)

## Import Organization

**Order:**
1. React imports (e.g., `import React, { useState }`)
2. Next.js imports (e.g., `import Link from 'next/link'`, `import { useSearchParams }`)
3. Third-party libraries (e.g., `import bcrypt`, `import { Loader2 } from 'lucide-react'`)
4. Local imports with `@/` alias
   - Components first (e.g., `import VideoCard from '@/components/VideoCard'`)
   - Then utilities (e.g., `import { generateStoragePath } from '@/lib/video-helpers'`)
   - Then types (e.g., `import { VideoUploadFormData } from '@/types/video'`)

**Path Aliases:**
- `@/*` → `./src/*` (configured in `tsconfig.json`)
- Used consistently across all imports (e.g., `@/lib/session`, `@/components/workspace/VideoPlayer`)

## Error Handling

**Pattern 1: API Routes (try-catch-NextResponse)**

```typescript
// From /api/auth/login/route.ts
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // ... logic ...
    
    return NextResponse.json(
      { message: 'Login successful', userId: user.id },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Pattern 2: Client Components (useState for error + setError)**

```typescript
// From ExportReportsSection.tsx
const [error, setError] = useState<string | null>(null);

const handleExport = async () => {
  if (!startDate || !endDate) {
    setError('Please select both start and end dates');
    return;
  }
  setError(null);
  setLoading(true);
  try {
    // ... async logic ...
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Export failed');
  } finally {
    setLoading(false);
  }
};
```

**Pattern 3: Error Boundaries (global and page-level)**

- `src/app/error.tsx`: Global error boundary for app-wide errors
- `src/app/workspace/error.tsx`: Page-specific error boundary
- Error components log to console and display user-friendly messages

**Validation:**
- Inline validation in handlers before async operations
- Return early with specific error messages
- Type-safe error responses from APIs

## Logging

**Framework:** console (no external logging library)

**Patterns:**

1. **Info/Debug Logs:** Prefix with component or module name in brackets
   ```typescript
   console.log('[Videos API] Fetching all videos with assignments...');
   console.log('[VideoCard] Assign clicked for video:', { id, title });
   ```

2. **Request Tracking:** Use random request IDs for debugging distributed flows
   ```typescript
   const reqId = Math.random().toString(36).slice(2, 8);
   console.log(`[ROUND-EXPORT ${reqId}] IN url=${request.url} videoId=${videoId}`);
   ```

3. **Error Logs:** Use `console.error()` with context
   ```typescript
   console.error('Login error:', error);
   console.error('[Round export error]', error);
   ```

4. **Development Aids:** Extensive debug logging in auth flow for external account sync
   ```typescript
   console.log('✅ FOUND in external /accounts:');
   console.log('   👤 Username:', externalAccount.username);
   console.log('   🔐 Permissions:', JSON.stringify(externalAccount.permissions));
   ```

**When to log:**
- API requests/responses (with method, status, key params)
- External system calls (external API syncs)
- State transitions (auth success, submission complete)
- Errors and exceptions

## Comments

**When to Comment:**
- Explain the "why," not the "what"
- Use for non-obvious algorithm logic or workarounds
- Prefix with // for inline, /** */ for JSDoc

**JSDoc/TSDoc:**
- Used in utility functions with public APIs
- Documents parameters, return types, and examples
- Example from `src/lib/video-helpers.ts`:
  ```typescript
  /**
   * Generate a storage path for a video file
   * Format: "{boxer1}_{boxer2}/r{round}/cam{camNum}.mp4"
   * 
   * @param boxer1 - First boxer name
   * @param boxer2 - Second boxer name
   * @param round - Round number
   * @param camNum - Camera number (1-3)
   * @returns Storage path string
   */
  export function generateStoragePath(boxer1, boxer2, round, camNum): string
  ```

**Inline Comments:**
- Used sparingly, mostly for non-obvious logic
- Example: `// Exclude COMPLETED assignments to hide from landing page`

## Function Design

**Size:**
- Most functions 30-100 lines
- API routes handle auth, validation, and response in single function
- Component logic split into handlers for clarity

**Parameters:**
- Destructured when possible (especially React props)
- Type all parameters explicitly
- Use interfaces for multi-parameter functions

**Return Values:**
- Always typed explicitly
- For async: return Promise<T>
- For handlers: void or return early on error

**Example Structure (Component):**
```typescript
interface VideoCardProps {
  id: string;
  title: string;
  // ... other props
}

const VideoCard = ({ id, title, ... }: VideoCardProps) => {
  const [state, setState] = useState(false);
  
  const handleAction = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      // ... logic ...
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return <div>{/* JSX */}</div>;
};
```

## Module Design

**Exports:**
- Default exports for React components
- Named exports for utilities, types, and helpers
- Example: `export default VideoCard` vs `export function generateStoragePath()`

**Barrel Files:**
- Used in `src/lib/storage/` (index.ts)
- Centralize re-exports of providers and utilities
- Example: `src/lib/storage/index.ts` exports upload functions

**Organization:**
- API routes: one per endpoint (e.g., `/api/videos/route.ts`, `/api/admin/export-events/round/route.ts`)
- Components: directory per feature area (auth, workspace, etc.)
- Utilities: flat in `src/lib/` for general use, sub-directories for domains (storage, session)
- Types: centralized in `src/types/`

## State Management

**Client Components:**
- React hooks (`useState`, `useRef`) for local/component state
- State lifted to nearest common parent for shared state
- Query params for URL-based state (e.g., `videoId` from search params)
- localStorage for persistence (with safe wrappers in `client-utils.ts`)

**Server/API:**
- Prisma ORM for database queries
- Direct async/await in API routes (no middleware pattern)
- Session stored in httpOnly cookies (via `jose` JWT library)

**Example (Component State):**
```typescript
// From workspace/page.tsx
const [events, setEvents] = useState<EventData[]>([]);
const [isSubmitting, setIsSubmitting] = useState(false);
const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

// From ExportReportsSection.tsx
const [startDate, setStartDate] = useState<Date | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

## API Route Patterns

**Structure (GET example):**
```typescript
// GET /api/videos
export async function GET() {
  try {
    // 1. Log request
    console.log('[Videos API] Fetching all videos...');
    
    // 2. Query database
    const videos = await prisma.video.findMany({
      // ... query options ...
    });
    
    // 3. Return success response
    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    // 4. Log and return error
    console.error('[Videos API] Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
```

**Structure (POST example with auth):**
```typescript
// POST /api/admin/export-events/round
export async function GET(request: NextRequest) {
  try {
    // 1. Check auth/session
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // 2. Check permissions
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !['ADMIN', 'QC'].includes(user.accountType)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // 3. Parse and validate params
    const videoId = request.nextUrl.searchParams.get('videoId');
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 });
    
    // 4. Execute business logic
    const events = await prisma.event.findMany({ /* ... */ });
    const csv = generateCSV(events);
    
    // 5. Return specialized response (streaming, file, etc.)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="export.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

**Response Format:**
- JSON objects with shape `{ data?, error?, message? }`
- Always include HTTP status code
- For file downloads: use `NextResponse` with headers
- Errors return 4xx/5xx with error field

---

*Convention analysis: 2026-04-30*
