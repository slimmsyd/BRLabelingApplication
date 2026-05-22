#!/usr/bin/env node
/**
 * READ-ONLY audit of fight-videos bucket cache-control state.
 *
 * Answers the question: "Of all files in the bucket, how many still have the
 * old `max-age=3600` cache header, and what are they?"
 *
 * Does NOT modify any files. Pure inspection.
 *
 * Usage: npx tsx scripts/audit-storage-cache.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BUCKET = 'fight-videos';
// "Old" = any header that is NOT our new 30-day target. Includes the original
// 'no-cache' default (the actual bulk of the bill) and the brief 'max-age=3600'
// stint from early uploads.
const NEW_CACHE_HEADER = 'max-age=2592000';
const OLD_CACHE_HEADERS = ['no-cache', 'max-age=3600'];
const PAGE_SIZE = 1000;

interface StorageFile {
  name: string;
  id: string | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  metadata: {
    eTag?: string;
    size?: number;
    mimetype?: string;
    cacheControl?: string;
    lastModified?: string;
    contentLength?: number;
    httpStatusCode?: number;
  } | null;
}

interface FileWithPath extends StorageFile {
  fullPath: string;
}

async function listRecursive(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  prefix: string,
): Promise<FileWithPath[]> {
  const out: FileWithPath[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const item of data as StorageFile[]) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      // Folders: id === null and metadata === null. Recurse.
      if (item.id === null) {
        const subItems = await listRecursive(supabase, fullPath);
        out.push(...subItems);
      } else {
        out.push({ ...item, fullPath });
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

function fmtMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1);
}

function ageDays(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log(`🔍 Auditing bucket "${BUCKET}" — read-only, no writes\n`);

  const files = await listRecursive(supabase, '');
  console.log(`📦 Total objects found: ${files.length}\n`);

  // ── Group by cacheControl value ─────────────────────────────────────
  const byHeader = new Map<string, { count: number; bytes: number }>();
  for (const f of files) {
    const cc = f.metadata?.cacheControl ?? '(none)';
    const size = f.metadata?.size ?? 0;
    const cur = byHeader.get(cc) ?? { count: 0, bytes: 0 };
    cur.count++;
    cur.bytes += size;
    byHeader.set(cc, cur);
  }

  console.log('📊 Distribution by Cache-Control:');
  console.log('─'.repeat(60));
  const sorted = [...byHeader.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [cc, stats] of sorted) {
    console.log(`   ${cc.padEnd(20)} ${String(stats.count).padStart(5)} files   ${fmtGB(stats.bytes).padStart(8)} GB`);
  }
  console.log('');

  // ── Files with any old header ───────────────────────────────────────
  const oldFiles = files.filter(f =>
    OLD_CACHE_HEADERS.includes(f.metadata?.cacheControl ?? '')
  );

  if (oldFiles.length === 0) {
    console.log(`✅ All files already have ${NEW_CACHE_HEADER}. Nothing to update.`);
    return;
  }

  console.log(`⚠️  Files with an old cache header (${OLD_CACHE_HEADERS.join(' or ')}): ${oldFiles.length}`);
  console.log('');

  // ── Age buckets for the old-header set ──────────────────────────────
  const ageBuckets = {
    '0–7 days   (active labeling window)':   { count: 0, bytes: 0 },
    '7–30 days  (recent)':                   { count: 0, bytes: 0 },
    '30–90 days (likely cold)':              { count: 0, bytes: 0 },
    '90+ days   (probably archival)':        { count: 0, bytes: 0 },
  };

  for (const f of oldFiles) {
    const d = ageDays(f.created_at);
    const size = f.metadata?.size ?? 0;
    let key: keyof typeof ageBuckets;
    if (d <= 7) key = '0–7 days   (active labeling window)';
    else if (d <= 30) key = '7–30 days  (recent)';
    else if (d <= 90) key = '30–90 days (likely cold)';
    else key = '90+ days   (probably archival)';
    ageBuckets[key].count++;
    ageBuckets[key].bytes += size;
  }

  console.log('🕒 Age of old-header files:');
  console.log('─'.repeat(60));
  for (const [label, s] of Object.entries(ageBuckets)) {
    console.log(`   ${label.padEnd(40)} ${String(s.count).padStart(4)} files   ${fmtGB(s.bytes).padStart(8)} GB`);
  }
  console.log('');

  // ── Sample for sanity check ────────────────────────────────────────
  console.log('📝 Sample (first 5 + newest 5 old-header files):');
  console.log('─'.repeat(60));
  const sample = [
    ...oldFiles.slice(0, 5),
    ...[...oldFiles].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ).slice(0, 5),
  ];
  const seen = new Set<string>();
  for (const f of sample) {
    if (seen.has(f.fullPath)) continue;
    seen.add(f.fullPath);
    console.log(`   ${f.fullPath}`);
    console.log(`      size: ${fmtMB(f.metadata?.size ?? 0)} MB   created: ${f.created_at.split('T')[0]}   age: ${ageDays(f.created_at).toFixed(0)}d`);
  }
  console.log('');

  // ── Summary recommendation ─────────────────────────────────────────
  const activeBytes = ageBuckets['0–7 days   (active labeling window)'].bytes
                    + ageBuckets['7–30 days  (recent)'].bytes;
  const coldBytes   = ageBuckets['30–90 days (likely cold)'].bytes
                    + ageBuckets['90+ days   (probably archival)'].bytes;

  console.log('💡 Decision aid:');
  console.log('─'.repeat(60));
  console.log(`   Files <30d old (worth re-stamping):   ${fmtGB(activeBytes)} GB`);
  console.log(`   Files >30d old (re-stamp is no-op):   ${fmtGB(coldBytes)} GB`);
  console.log('');
  console.log('   Rule of thumb: a file only contributes to ongoing egress');
  console.log('   if someone still streams it. If it has not been touched in');
  console.log('   30+ days, re-stamping its cache header saves nothing.');
  console.log('');
  console.log('✅ Audit complete. No files were modified.');
}

main().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
