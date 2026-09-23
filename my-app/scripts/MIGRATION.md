# Supabase Account Migration Runbook

Full lift-and-shift of the LabelingApp from one Supabase account to another:
all Postgres data (users, videos, assignments, QC events) **and** all
`fight-videos` storage (~241 GB). The app is live, so this runs inside a freeze
window with verification and a rollback path.

Two helper scripts in this folder do the non-trivial parts:
- `migrate-storage-bucket.ts` — resumable cross-account copy of the storage bucket
- `rewrite-source-urls.ts` — repoints the project host baked into `Video.sourceUrls`

Everything else is `pg_dump`/`pg_restore` + config changes.

---

## Credentials you need (both accounts)

From each project's Supabase Dashboard:
- **Database → Connection string → "Session"/Direct** (port **5432**, NOT the 6543 transaction pooler — `pg_dump` needs the direct connection). Call these `OLD_DIRECT_URL` and `NEW_DIRECT_URL`.
- **Project URL** (`https://<ref>.supabase.co`) and **service_role key** (Settings → API).

Set them up as shell vars before you start (don't commit these anywhere):

```bash
export OLD_DIRECT_URL='postgresql://postgres:...@db.<OLD>.supabase.co:5432/postgres'
export NEW_DIRECT_URL='postgresql://postgres:...@db.<NEW>.supabase.co:5432/postgres'

export OLD_SUPABASE_URL='https://<OLD>.supabase.co'
export OLD_SERVICE_ROLE_KEY='...'
export NEW_SUPABASE_URL='https://<NEW>.supabase.co'
export NEW_SERVICE_ROLE_KEY='...'
```

Tooling: `pg_dump`/`pg_restore` **v16+** (`brew install postgresql@16`), Node + `npx tsx`.

---

## Phase 0 — Prep the destination

```bash
cd my-app

# 1. Point Prisma at the NEW project and recreate the schema (all 14 migrations).
#    Temporarily edit .env so DATABASE_URL/DIRECT_URL = the new project, then:
npx prisma migrate deploy

# 2. In the NEW project's Dashboard → Storage, create a PUBLIC bucket named
#    exactly: fight-videos   (match the old bucket's public/private setting).
```

Verify: the new DB now has `User`, `Video`, `VideoAssignment`, `Event` (empty) and `_prisma_migrations` with 14 rows.

---

## Phase 1 — Freeze (active users)

1. Announce the maintenance window to labelers/QC.
2. Take the app offline so no Events/Assignments are written during the dump
   (pause the deployment, or put it in maintenance mode). This is what makes the
   snapshot consistent.

---

## Phase 2 — Migrate the database (data only)

```bash
# Dump DATA ONLY from the old project (custom format).
pg_dump "$OLD_DIRECT_URL" --data-only --no-owner --no-privileges -Fc -f labelingapp-data.dump

# Restore into the new project. --disable-triggers handles FK ordering
# (Event → VideoAssignment → Video/User); --single-transaction is all-or-nothing.
pg_restore --data-only --disable-triggers --no-owner --single-transaction \
  -d "$NEW_DIRECT_URL" labelingapp-data.dump
```

`Event.createdAt` is preserved verbatim, so productivity-report weeks stay intact.

If `pg_restore` complains about the `_prisma_migrations` table already having rows
(it was populated by `migrate deploy` in Phase 0), that's expected and harmless —
the data-only dump's migration rows collide with the ones Prisma created. You can
ignore it, or exclude that table from the dump with
`--exclude-table-data=_prisma_migrations` on the `pg_dump` command.

---

## Phase 3 — Migrate storage (~241 GB)

```bash
cd my-app

# Dry run first — lists how many files / GB will copy, writes nothing.
DRY_RUN=true npx tsx scripts/migrate-storage-bucket.ts

# Real copy. Resumable: re-run any time; it skips files already in the new bucket.
npx tsx scripts/migrate-storage-bucket.ts
```

The script reads `OLD_SUPABASE_URL` / `OLD_SERVICE_ROLE_KEY` / `NEW_SUPABASE_URL`
/ `NEW_SERVICE_ROLE_KEY` from the environment, copies every object, and applies
the 30-day `cacheControl` (the header that fixed the prior egress overrun).
Tune throughput with `MIGRATE_CONCURRENCY=8` if the network allows.

> Faster alternative for 241 GB: `rclone` between the two projects' S3-compatible
> storage endpoints. The script above is the known-good path and is fine to use.

---

## Phase 4 — Rewrite embedded URLs + repoint config

```bash
cd my-app

# 1. Repoint Video.sourceUrls at the new host. Run against the NEW DB
#    (DATABASE_URL must already point at the new project).
DRY_RUN=true OLD_PROJECT_HOST=<OLD>.supabase.co NEW_PROJECT_HOST=<NEW>.supabase.co \
  npx tsx scripts/rewrite-source-urls.ts          # preview
OLD_PROJECT_HOST=<OLD>.supabase.co NEW_PROJECT_HOST=<NEW>.supabase.co \
  npx tsx scripts/rewrite-source-urls.ts          # execute
```

2. Update **local** `my-app/.env` → new project:
   `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL`.
3. Update **deployment** env vars (Vercel/host dashboard) to the same new values.
   This is the production cutover.

---

## Phase 5 — Verify (before lifting the freeze)

```bash
# Row counts — run against each DB and compare.
psql "$OLD_DIRECT_URL" -c 'SELECT
  (SELECT count(*) FROM "User") u,
  (SELECT count(*) FROM "Video") v,
  (SELECT count(*) FROM "VideoAssignment") a,
  (SELECT count(*) FROM "Event") e;'
psql "$NEW_DIRECT_URL" -c 'SELECT
  (SELECT count(*) FROM "User") u,
  (SELECT count(*) FROM "Video") v,
  (SELECT count(*) FROM "VideoAssignment") a,
  (SELECT count(*) FROM "Event") e;'

# Storage parity — re-run the copy; it should report "0 to copy".
npx tsx scripts/migrate-storage-bucket.ts
```

Then a functional spot-check against the new project:
- Log in as an existing user (bcrypt password works → User table intact).
- Open a video → storage URL resolves on the new host (no 404).
- Open a submitted/QC'd assignment → Events present with correct dates.
- Admin export / productivity view → dates land in the correct weeks.

---

## Phase 6 — Cutover & rollback

- Verified → bring the app up on the new project, end the freeze.
- **Keep the old project fully intact** (DB + storage) for 1–2 weeks. If anything
  is wrong, repoint env vars back to the old project = instant rollback.
- Only delete the old account's data once the new one is confirmed stable.
