/**
 * Script to ONLY update database records for storage paths
 * (Files were already copied in previous run)
 * 
 * Run with: npx tsx scripts/fix-storage-paths-db.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET_NAME = 'fight-videos';

// Updates to make - in REVERSE order to avoid unique constraint conflicts
const UPDATES = [
  // R7: r5 → r7 (already done in first run)
  // R6: r4 → r6 (already done in first run)
  // Need to fix: R3, R4, R5
  {
    id: 'cmk78nwhs0000jp04ftex8ac9',
    title: 'R5',
    newFolder: 'junto_nakatani_sebastian_hernandez/r5',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
  {
    id: 'cmk78kuq70000l804cdtp539u',
    title: 'R4',
    newFolder: 'junto_nakatani_sebastian_hernandez/r4',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
  {
    id: 'cmk78ihal0000k104nbxb8rvm',
    title: 'R3',
    newFolder: 'junto_nakatani_sebastian_hernandez/r3',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
];

async function main() {
  console.log('📝 Fixing Database Storage Paths');
  console.log('================================\n');

  // First, let's check current state
  console.log('Current state:\n');
  const videos = await prisma.video.findMany({
    where: {
      title: { contains: 'Junto Nakatani' },
    },
    select: { id: true, title: true, storagePath: true, round: true },
    orderBy: { round: 'asc' },
  });

  for (const v of videos) {
    console.log(`  ${v.title} (round ${v.round}): ${v.storagePath}`);
  }

  console.log('\n\n📝 Updating records in reverse order...\n');

  for (const update of UPDATES) {
    const newStoragePath = `${update.newFolder}/cam1.mp4`;
    const newSourceUrls = update.cameras.map(
      (cam) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${update.newFolder}/${cam}`
    );

    console.log(`\n🎯 Updating ${update.title} (${update.id})`);
    console.log(`   New storagePath: ${newStoragePath}`);

    try {
      await prisma.video.update({
        where: { id: update.id },
        data: {
          storagePath: newStoragePath,
          sourceUrls: newSourceUrls,
        },
      });
      console.log(`   ✅ Updated successfully`);
    } catch (error) {
      console.error(`   ❌ Failed: ${error}`);
    }
  }

  console.log('\n\n📋 Final state:\n');
  const updatedVideos = await prisma.video.findMany({
    where: {
      title: { contains: 'Junto Nakatani' },
    },
    select: { id: true, title: true, storagePath: true, round: true },
    orderBy: { round: 'asc' },
  });

  for (const v of updatedVideos) {
    const expectedPath = `junto_nakatani_sebastian_hernandez/r${v.round}/cam1.mp4`;
    const match = v.storagePath === expectedPath ? '✅' : '❌';
    console.log(`  ${match} ${v.title} (round ${v.round}): ${v.storagePath}`);
  }

  console.log('\n✅ Done!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});

export {};
