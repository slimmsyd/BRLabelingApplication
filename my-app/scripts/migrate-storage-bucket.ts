#!/usr/bin/env node
/**
 * Cross-account migration of the `fight-videos` storage bucket.
 *
 * Copies every object from the OLD Supabase project's bucket to the NEW
 * project's bucket. Resumable (skips files already present in the new bucket)
 * and safe to re-run. Pure copy — never deletes from the source.
 *
 * Modeled on the download → upload logic in scripts/rename-storage-paths.ts,
 * extended to talk to two separate Supabase projects at once.
 *
 * Required env vars (set inline or in a .env.migrate file you pass via dotenv):
 *   OLD_SUPABASE_URL        e.g. https://abcdold.supabase.co
 *   OLD_SERVICE_ROLE_KEY    service_role key for the OLD project
 *   NEW_SUPABASE_URL        e.g. https://abcdnew.supabase.co
 *   NEW_SERVICE_ROLE_KEY    service_role key for the NEW project
 * Optional:
 *   MIGRATE_CONCURRENCY     parallel transfers (default 4)
 *   DRY_RUN                 'true' to list work without copying
 *
 * Usage:
 *   OLD_SUPABASE_URL=... OLD_SERVICE_ROLE_KEY=... \
 *   NEW_SUPABASE_URL=... NEW_SERVICE_ROLE_KEY=... \
 *   npx tsx scripts/migrate-storage-bucket.ts
 *
 * The NEW project must already have a public `fight-videos` bucket (Phase 0).
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'fight-videos';
const PAGE_SIZE = 1000;
const CONCURRENCY = Number(process.env.MIGRATE_CONCURRENCY ?? 4);
const DRY_RUN = process.env.DRY_RUN === 'true';
// 30-day cache — matches supabase-provider.ts:32, the header that fixed the
// prior egress overrun. Re-applied here so migrated files inherit it.
const CACHE_CONTROL = '2592000';

interface StorageFileMeta {
  size?: number;
  mimetype?: string;
}
interface StorageItem {
  name: string;
  id: string | null;
  metadata: StorageFileMeta | null;
}
interface FileWithPath {
  fullPath: string;
  size: number;
  mimetype: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Missing required env var: ${name}`);
    process.exit(1);
  }
  return v;
}

async function listRecursive(
  client: SupabaseClient,
  prefix: string,
): Promise<FileWithPath[]> {
  const out: FileWithPath[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await client.storage.from(BUCKET).list(prefix, {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data as StorageItem[]) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      // Folders surface as id === null && metadata === null. Recurse into them.
      if (item.id === null) {
        out.push(...(await listRecursive(client, fullPath)));
      } else {
        out.push({
          fullPath,
          size: item.metadata?.size ?? 0,
          mimetype: item.metadata?.mimetype ?? 'video/mp4',
        });
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return out;
}

function fmtGB(bytes: number): string {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

async function copyOne(
  oldClient: SupabaseClient,
  newClient: SupabaseClient,
  file: FileWithPath,
): Promise<void> {
  const { data, error: dErr } = await oldClient.storage
    .from(BUCKET)
    .download(file.fullPath);
  if (dErr || !data) {
    throw new Error(`download ${file.fullPath}: ${dErr?.message ?? 'no data'}`);
  }

  const { error: uErr } = await newClient.storage
    .from(BUCKET)
    .upload(file.fullPath, data, {
      contentType: file.mimetype || 'video/mp4',
      cacheControl: CACHE_CONTROL,
      upsert: true,
    });
  if (uErr) {
    throw new Error(`upload ${file.fullPath}: ${uErr.message}`);
  }
}

async function main() {
  const oldClient = createClient(
    requireEnv('OLD_SUPABASE_URL'),
    requireEnv('OLD_SERVICE_ROLE_KEY'),
  );
  const newClient = createClient(
    requireEnv('NEW_SUPABASE_URL'),
    requireEnv('NEW_SERVICE_ROLE_KEY'),
  );

  console.log(`🚚 Migrating bucket "${BUCKET}" (old → new)`);
  console.log(`   concurrency=${CONCURRENCY}  dry_run=${DRY_RUN}\n`);

  console.log('📂 Listing source bucket...');
  const sourceFiles = await listRecursive(oldClient, '');
  const sourceBytes = sourceFiles.reduce((n, f) => n + f.size, 0);
  console.log(`   source: ${sourceFiles.length} files, ${fmtGB(sourceBytes)} GB`);

  console.log('📂 Listing destination bucket (for resume)...');
  const destFiles = await listRecursive(newClient, '');
  const destPaths = new Set(destFiles.map((f) => f.fullPath));
  console.log(`   destination already has: ${destFiles.length} files\n`);

  const todo = sourceFiles.filter((f) => !destPaths.has(f.fullPath));
  const todoBytes = todo.reduce((n, f) => n + f.size, 0);
  console.log(`📝 To copy: ${todo.length} files, ${fmtGB(todoBytes)} GB`);
  console.log(`   (skipping ${sourceFiles.length - todo.length} already present)\n`);

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN — no files copied. Set DRY_RUN=false (or unset) to execute.');
    return;
  }
  if (todo.length === 0) {
    console.log('✅ Nothing to copy. Buckets are in sync.');
    return;
  }

  let done = 0;
  let copiedBytes = 0;
  const failures: { path: string; error: string }[] = [];

  // Simple fixed-size worker pool over a shared index.
  let cursor = 0;
  async function worker(workerId: number) {
    while (true) {
      const i = cursor++;
      if (i >= todo.length) break;
      const file = todo[i];
      try {
        await copyOne(oldClient, newClient, file);
        copiedBytes += file.size;
        done++;
        if (done % 10 === 0 || done === todo.length) {
          console.log(
            `   [${done}/${todo.length}] ${fmtGB(copiedBytes)}/${fmtGB(todoBytes)} GB  (w${workerId}) ${file.fullPath}`,
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failures.push({ path: file.fullPath, error: msg });
        console.error(`   ❌ ${file.fullPath}: ${msg}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, CONCURRENCY) }, (_, k) => worker(k + 1)),
  );

  console.log('\n──────── Migration manifest ────────');
  console.log(`   copied:   ${done} files, ${fmtGB(copiedBytes)} GB`);
  console.log(`   failed:   ${failures.length}`);
  if (failures.length) {
    console.log('\n⚠️  Failed files (re-run the script to retry — it resumes):');
    for (const f of failures.slice(0, 50)) {
      console.log(`     ${f.path}  —  ${f.error}`);
    }
    if (failures.length > 50) console.log(`     ...and ${failures.length - 50} more`);
    process.exit(1);
  }

  console.log('\n✅ All files copied. Re-run to verify (should report 0 to copy).');
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});

export {};
