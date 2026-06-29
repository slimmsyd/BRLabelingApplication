#!/usr/bin/env node
/**
 * Archive the top 6 cold fight cards: delete MP4s from storage, mark Video.archived.
 * Labeling data (assignments + events) is preserved in Postgres.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/archive-top-fights.ts   # preview
 *   npx tsx scripts/archive-top-fights.ts              # execute
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const BUCKET = 'fight-videos';
const DRY_RUN = process.env.DRY_RUN === 'true';

const FIGHT_SLUGS = [
  'manny_pacquiao_timothy_bradley_jr',
  'oleksandr_usyk_anthony_joshua',
  'teofimo_lopez_sandor_martin',
  'devin_haney_brian_norman_jr',
  'naoya_inoue_alan_picasso',
  'jermell_charlo_brian_castano',
];

function pathsForVideo(v: { storagePath: string; sourceUrls: unknown }): string[] {
  const paths = new Set<string>([v.storagePath]);
  const urls = Array.isArray(v.sourceUrls) ? (v.sourceUrls as string[]) : [];
  for (const url of urls) {
    const marker = `/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx >= 0) paths.add(decodeURIComponent(url.slice(idx + marker.length)));
  }
  return [...paths];
}

function fmtGB(bytes: number): string {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const supabase = createClient(url, key);

  const videos = await prisma.video.findMany({
    where: {
      OR: FIGHT_SLUGS.map((slug) => ({ storagePath: { startsWith: `${slug}/` } })),
      archived: false,
    },
    select: { id: true, title: true, storagePath: true, sourceUrls: true },
  });

  const allPaths = new Set<string>();
  for (const v of videos) {
    for (const p of pathsForVideo(v)) allPaths.add(p);
  }

  console.log(`Archive top ${FIGHT_SLUGS.length} fights | dry_run=${DRY_RUN}`);
  console.log(`Videos to mark archived: ${videos.length}`);
  console.log(`Storage files to delete: ${allPaths.size}`);
  console.log('Paths:');
  for (const p of [...allPaths].sort()) console.log(`  ${p}`);

  if (DRY_RUN) {
    console.log('\nDRY RUN — no changes made.');
    await prisma.$disconnect();
    return;
  }

  if (allPaths.size > 0) {
    const paths = [...allPaths];
    const BATCH = 50;
    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = paths.slice(i, i + BATCH);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) throw new Error(`Storage delete failed: ${error.message}`);
      console.log(`Deleted batch ${i / BATCH + 1}: ${batch.length} files`);
    }
  }

  const now = new Date();
  const result = await prisma.video.updateMany({
    where: { id: { in: videos.map((v) => v.id) } },
    data: { archived: true, archivedAt: now },
  });

  console.log(`\nMarked ${result.count} videos as archived at ${now.toISOString()}`);
  console.log('Done. Labeling data preserved in Postgres.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Archive failed:', err);
  process.exit(1);
});