/**
 * Script to rename storage paths for Junto Nakatani v Sebastian Hernandez fight
 * 
 * This script:
 * 1. Copies video files to new round-numbered paths in Supabase Storage
 * 2. Updates the database records (storagePath and sourceUrls)
 * 3. Optionally deletes the old files
 * 
 * Run with: npx tsx scripts/rename-storage-paths.ts
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET_NAME = 'fight-videos';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapping of video IDs to their old and new paths
const RENAMES = [
  {
    id: 'cmk78ihal0000k104nbxb8rvm',
    title: 'R3',
    oldFolder: 'junto_nakatani_sebastian_hernandez/r1',
    newFolder: 'junto_nakatani_sebastian_hernandez/r3',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
  {
    id: 'cmk78kuq70000l804cdtp539u',
    title: 'R4',
    oldFolder: 'junto_nakatani_sebastian_hernandez/r2',
    newFolder: 'junto_nakatani_sebastian_hernandez/r4',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
  {
    id: 'cmk78nwhs0000jp04ftex8ac9',
    title: 'R5',
    oldFolder: 'junto_nakatani_sebastian_hernandez/r3',
    newFolder: 'junto_nakatani_sebastian_hernandez/r5',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
  {
    id: 'cmk78qfpk0000la04ry4sq25t',
    title: 'R6',
    oldFolder: 'junto_nakatani_sebastian_hernandez/r4',
    newFolder: 'junto_nakatani_sebastian_hernandez/r6',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
  {
    id: 'cmk78tqjd0001l804h7nofoi9',
    title: 'R7',
    oldFolder: 'junto_nakatani_sebastian_hernandez/r5',
    newFolder: 'junto_nakatani_sebastian_hernandez/r7',
    cameras: ['cam1.mp4', 'cam2.mp4'],
  },
];

// DRY RUN MODE - set to false to actually execute
const DRY_RUN = false;

async function copyFile(oldPath: string, newPath: string): Promise<boolean> {
  console.log(`  📋 Copying: ${oldPath} → ${newPath}`);
  
  if (DRY_RUN) {
    console.log(`     [DRY RUN] Would copy file`);
    return true;
  }

  try {
    // Download the file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(oldPath);

    if (downloadError || !fileData) {
      console.error(`     ❌ Download failed: ${downloadError?.message}`);
      return false;
    }

    // Upload to new location
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(newPath, fileData, {
        contentType: 'video/mp4',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error(`     ❌ Upload failed: ${uploadError.message}`);
      return false;
    }

    console.log(`     ✅ File copied successfully`);
    return true;
  } catch (error) {
    console.error(`     ❌ Error: ${error}`);
    return false;
  }
}

async function updateDatabase(
  videoId: string,
  newStoragePath: string,
  newSourceUrls: string[]
): Promise<boolean> {
  console.log(`  📝 Updating database for video ${videoId}`);
  console.log(`     New storagePath: ${newStoragePath}`);
  console.log(`     New sourceUrls: ${newSourceUrls.join(', ')}`);

  if (DRY_RUN) {
    console.log(`     [DRY RUN] Would update database`);
    return true;
  }

  try {
    await prisma.video.update({
      where: { id: videoId },
      data: {
        storagePath: newStoragePath,
        sourceUrls: newSourceUrls,
      },
    });
    console.log(`     ✅ Database updated`);
    return true;
  } catch (error) {
    console.error(`     ❌ Database update failed: ${error}`);
    return false;
  }
}

async function deleteOldFile(oldPath: string): Promise<boolean> {
  console.log(`  🗑️  Deleting old file: ${oldPath}`);

  if (DRY_RUN) {
    console.log(`     [DRY RUN] Would delete file`);
    return true;
  }

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([oldPath]);

    if (error) {
      console.error(`     ❌ Delete failed: ${error.message}`);
      return false;
    }

    console.log(`     ✅ File deleted`);
    return true;
  } catch (error) {
    console.error(`     ❌ Error: ${error}`);
    return false;
  }
}

async function main() {
  console.log('🎬 Storage Path Rename Script');
  console.log('============================\n');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    console.log('Set DRY_RUN = false to execute\n');
  }

  // IMPORTANT: Process in reverse order to avoid conflicts
  // (r5 → r7 first, then r4 → r6, etc.)
  const reversedRenames = [...RENAMES].reverse();

  console.log('📂 Step 1: Copy files to new locations (reverse order to avoid conflicts)\n');

  for (const rename of reversedRenames) {
    console.log(`\n🎯 Processing ${rename.title} (${rename.id})`);
    console.log(`   From: ${rename.oldFolder}`);
    console.log(`   To:   ${rename.newFolder}`);

    for (const camera of rename.cameras) {
      const oldPath = `${rename.oldFolder}/${camera}`;
      const newPath = `${rename.newFolder}/${camera}`;
      
      const success = await copyFile(oldPath, newPath);
      if (!success && !DRY_RUN) {
        console.error(`\n❌ Failed to copy ${oldPath}. Stopping.`);
        return;
      }
    }
  }

  console.log('\n\n📝 Step 2: Update database records (reverse order to avoid unique constraint conflicts)\n');

  // Update in reverse order to avoid storagePath unique constraint conflicts
  for (const rename of reversedRenames) {
    const newStoragePath = `${rename.newFolder}/cam1.mp4`;
    const newSourceUrls = rename.cameras.map(
      (cam) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${rename.newFolder}/${cam}`
    );

    await updateDatabase(rename.id, newStoragePath, newSourceUrls);
  }

  console.log('\n\n🗑️  Step 3: Delete old files (optional - uncomment to enable)\n');

  // Uncomment the following block to delete old files after successful migration
  /*
  for (const rename of RENAMES) {
    for (const camera of rename.cameras) {
      const oldPath = `${rename.oldFolder}/${camera}`;
      await deleteOldFile(oldPath);
    }
  }
  */
  console.log('   [SKIPPED] Old files preserved for safety');

  console.log('\n\n✅ Script completed!');
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. Set DRY_RUN = false to execute.');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});

export {};
