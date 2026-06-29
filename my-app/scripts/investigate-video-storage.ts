#!/usr/bin/env node
/**
 * READ-ONLY investigation: where and how videos are stored.
 * Cross-references Postgres Video rows vs fight-videos bucket objects.
 *
 * Usage: npx tsx scripts/investigate-video-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BUCKET = 'fight-videos';
const PAGE_SIZE = 1000;

interface StorageFile {
  name: string;
  id: string | null;
  created_at: string;
  metadata: { size?: number; cacheControl?: string; mimetype?: string } | null;
}

interface FileWithPath extends StorageFile {
  fullPath: string;
}

function fmtGB(bytes: number): string {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
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
      if (item.id === null) {
        out.push(...(await listRecursive(supabase, fullPath)));
      } else {
        out.push({ ...item, fullPath });
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return out;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('VIDEO STORAGE INVESTIGATION (read-only)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('── Active configuration ──');
  console.log(`   Supabase host:  ${hostFromUrl(supabaseUrl)}`);
  console.log(`   Storage bucket: ${BUCKET} (public)`);
  console.log(`   DB host:        ${dbUrl ? hostFromUrl(dbUrl.replace(/^postgresql:\/\//, 'https://')) : '(missing)'}`);
  console.log(`   STORAGE_PROVIDER env: ${process.env.STORAGE_PROVIDER ?? '(default: supabase)'}`);
  if (process.env.NEW_SUPABASE_URL) {
    console.log(`   NEW project (migration target): ${hostFromUrl(process.env.NEW_SUPABASE_URL)}`);
  }
  console.log('');

  // Bucket metadata
  const bucketRes = await fetch(`${supabaseUrl}/storage/v1/bucket/${BUCKET}`, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  });
  if (bucketRes.ok) {
    const bucket = await bucketRes.json();
    const limitGB = ((bucket.file_size_limit ?? 0) / 1024 / 1024 / 1024).toFixed(1);
    console.log('── Bucket config ──');
    console.log(`   public: ${bucket.public}`);
    console.log(`   per-file size limit: ${limitGB} GB`);
    console.log(`   allowed mime types: ${JSON.stringify(bucket.allowed_mime_types ?? 'any')}`);
    console.log('');
  }

  const prisma = new PrismaClient();
  const supabase = createClient(supabaseUrl, serviceKey);

  // ── Database side ────────────────────────────────────────────────
  console.log('── Database: Video table ──');
  const videos = await prisma.video.findMany({
    select: {
      id: true,
      storagePath: true,
      storageProvider: true,
      title: true,
      numCameraViews: true,
      sourceUrls: true,
      createdAt: true,
      assignments: { select: { id: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const byProvider = new Map<string, number>();
  for (const v of videos) {
    byProvider.set(v.storageProvider, (byProvider.get(v.storageProvider) ?? 0) + 1);
  }

  console.log(`   Total Video rows: ${videos.length}`);
  for (const [p, n] of byProvider) console.log(`     ${p}: ${n}`);
  console.log('');

  // Extract all storage paths referenced by DB (primary + extra cameras in sourceUrls)
  const dbPaths = new Set<string>();
  const urlHosts = new Map<string, number>();

  for (const v of videos) {
    dbPaths.add(v.storagePath);
    const urls = Array.isArray(v.sourceUrls) ? (v.sourceUrls as string[]) : [];
    for (const url of urls) {
      const host = hostFromUrl(url);
      urlHosts.set(host, (urlHosts.get(host) ?? 0) + 1);
      // Parse path from public URL: .../object/public/fight-videos/<path>
      const marker = `/object/public/${BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx >= 0) {
        dbPaths.add(decodeURIComponent(url.slice(idx + marker.length)));
      }
    }
  }

  console.log('── sourceUrls host distribution (where playback URLs point) ──');
  for (const [host, n] of [...urlHosts.entries()].sort((a, b) => b[1] - a[1])) {
    const active = host === hostFromUrl(supabaseUrl) ? ' ← ACTIVE' : '';
    console.log(`   ${host}: ${n} URLs${active}`);
  }
  console.log(`   Unique storage paths referenced by DB: ${dbPaths.size}`);
  console.log('');

  // Assignment activity — helps judge deletability
  const withAssignments = videos.filter((v) => v.assignments.length > 0).length;
  const completedOnly = videos.filter(
    (v) => v.assignments.length > 0 && v.assignments.every((a) => a.status === 'COMPLETED'),
  ).length;
  const noAssignments = videos.filter((v) => v.assignments.length === 0).length;

  console.log('── Video assignment coverage ──');
  console.log(`   With any assignment:     ${withAssignments}`);
  console.log(`   All assignments COMPLETED: ${completedOnly}`);
  console.log(`   No assignments at all:   ${noAssignments}`);
  console.log('');

  // Age distribution of DB videos
  const ageBuckets: Record<string, number> = {
    '0-30d': 0,
    '30-90d': 0,
    '90-180d': 0,
    '180d+': 0,
  };
  const now = Date.now();
  for (const v of videos) {
    const days = (now - v.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 30) ageBuckets['0-30d']++;
    else if (days <= 90) ageBuckets['30-90d']++;
    else if (days <= 180) ageBuckets['90-180d']++;
    else ageBuckets['180d+']++;
  }
  console.log('── DB video age (by createdAt) ──');
  for (const [label, n] of Object.entries(ageBuckets)) {
    console.log(`   ${label.padEnd(8)} ${n}`);
  }
  console.log('');

  // ── Storage bucket side ────────────────────────────────────────────
  console.log('── Storage bucket: listing all objects (may take a minute)... ──');
  const bucketFiles = await listRecursive(supabase, '');
  const bucketBytes = bucketFiles.reduce((n, f) => n + (f.metadata?.size ?? 0), 0);

  console.log(`   Total objects in bucket: ${bucketFiles.length}`);
  console.log(`   Total size in bucket:    ${fmtGB(bucketBytes)} GB`);
  console.log('');

  const bucketPathSet = new Set(bucketFiles.map((f) => f.fullPath));

  // Cache-control breakdown
  const ccMap = new Map<string, { count: number; bytes: number }>();
  for (const f of bucketFiles) {
    const cc = f.metadata?.cacheControl ?? '(none)';
    const cur = ccMap.get(cc) ?? { count: 0, bytes: 0 };
    cur.count++;
    cur.bytes += f.metadata?.size ?? 0;
    ccMap.set(cc, cur);
  }
  console.log('── Cache-Control distribution (egress cost driver) ──');
  for (const [cc, s] of [...ccMap.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
    console.log(`   ${cc.padEnd(20)} ${String(s.count).padStart(5)} files  ${fmtGB(s.bytes).padStart(8)} GB`);
  }
  console.log('');

  // ── Cross-reference ──────────────────────────────────────────────
  const orphanInBucket = bucketFiles.filter((f) => !dbPaths.has(f.fullPath));
  const orphanInDb = [...dbPaths].filter((p) => !bucketPathSet.has(p));

  const orphanBytes = orphanInBucket.reduce((n, f) => n + (f.metadata?.size ?? 0), 0);

  console.log('── Cross-reference: DB ↔ bucket ──');
  console.log(`   Bucket files NOT in DB (orphan storage): ${orphanInBucket.length}  (${fmtGB(orphanBytes)} GB)`);
  console.log(`   DB paths NOT in bucket (missing files):  ${orphanInDb.length}`);
  console.log('');

  if (orphanInBucket.length > 0) {
    console.log('   Top 15 orphan bucket files by size (candidates for cleanup review):');
    const top = [...orphanInBucket]
      .sort((a, b) => (b.metadata?.size ?? 0) - (a.metadata?.size ?? 0))
      .slice(0, 15);
    for (const f of top) {
      const mb = ((f.metadata?.size ?? 0) / 1024 / 1024).toFixed(1);
      console.log(`     ${f.fullPath}  (${mb} MB, created ${f.created_at.split('T')[0]})`);
    }
    console.log('');
  }

  if (orphanInDb.length > 0) {
    console.log('   DB paths missing from bucket (first 15):');
    for (const p of orphanInDb.slice(0, 15)) {
      console.log(`     ${p}`);
    }
    console.log('');
  }

  // Path structure
  const topFolders = new Map<string, number>();
  for (const f of bucketFiles) {
    const folder = f.fullPath.split('/')[0] ?? '(root)';
    topFolders.set(folder, (topFolders.get(folder) ?? 0) + 1);
  }
  console.log('── Bucket folder layout (top-level prefixes) ──');
  const sortedFolders = [...topFolders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  for (const [folder, count] of sortedFolders) {
    console.log(`   ${folder}/  →  ${count} files`);
  }
  console.log('');

  // How storage works — summary
  console.log('── How videos are stored (architecture) ──');
  console.log('   1. Binary MP4 files → Supabase Storage bucket "fight-videos"');
  console.log('   2. Path pattern: {boxer1}_{boxer2}/r{round}/cam{n}.mp4');
  console.log('   3. One Video DB row per fight-round; storagePath = cam1 path');
  console.log('   4. Extra camera angles share the row via sourceUrls JSON array');
  console.log('   5. Playback uses public URLs from sourceUrls (not re-fetched from storagePath)');
  console.log('   6. Assignments/Events are metadata only — no video bytes in Postgres');
  console.log('');

  console.log('── Storage pressure assessment ──');
  console.log(`   Bucket usage: ${fmtGB(bucketBytes)} GB across ${bucketFiles.length} files`);
  if (orphanInBucket.length > 0) {
    console.log(`   Recoverable if orphans are safe to delete: up to ${fmtGB(orphanBytes)} GB`);
    console.log('   ⚠️  Do NOT delete orphans without verifying they are failed uploads or duplicates.');
  }
  const oldCacheBytes = bucketFiles
    .filter((f) => ['no-cache', 'max-age=3600', '(none)'].includes(f.metadata?.cacheControl ?? '(none)'))
    .reduce((n, f) => n + (f.metadata?.size ?? 0), 0);
  console.log(`   Files with short/no cache header: ${fmtGB(oldCacheBytes)} GB`);
  console.log('   (Short cache headers increase egress bills, NOT storage quota.)');
  console.log('');
  console.log('✅ Investigation complete. No data was modified.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ Investigation failed:', err);
  process.exit(1);
});