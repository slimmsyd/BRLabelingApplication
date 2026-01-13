/**
 * Backfill Script - Fix historical data issues
 * 
 * Issues fixed:
 * 1. reviewedAt timestamps are NULL for REVIEWED assignments
 * 2. labeledBy/labeledByEmail missing on older events
 * 3. Re-send data to external API with proper format
 * 
 * Run with: npx tsx scripts/backfill-data.ts
 * 
 * Use --dry-run to preview without making changes
 * Use --skip-external to skip external API calls
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXTERNAL_API_BASE_URL = 'https://www.huemanAPI.com';
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXTERNAL = process.argv.includes('--skip-external');

interface EventData {
  id: string;
  startTime: string;
  endTime: string;
  boxer: string;
  punchType: string;
  hand: string;
  target: string;
  visibilityFlags: string[];
  knockdown: boolean;
  punchQuality: string;
  cam: string | null;
  stance: string | null;
  landed: boolean | null;
  punchResult: string | null;
  defenseType: string | null;
  labeledBy: string | null;
  labeledByEmail: string | null;
}

// Transform event for external API format
function transformEventForExternalAPI(event: EventData) {
  // Parse time string to get formatted version
  const formatTime = (timeStr: string) => {
    // Already formatted as MM:SS.ms
    return timeStr;
  };

  return {
    eventType: 'punch',
    fighter: event.boxer === 'Boxer A' ? 'boxer1' : 'boxer2',
    startTime: parseFloat(event.startTime.replace(':', '.')) || 0,
    endTime: parseFloat(event.endTime.replace(':', '.')) || 0,
    startTimeFormatted: formatTime(event.startTime),
    endTimeFormatted: formatTime(event.endTime),
    hand: event.hand?.toLowerCase() || 'unknown',
    punchType: event.punchType,
    target: event.target,
    punchQuality: event.punchQuality,
    knockdown: event.knockdown,
    stoppageKo: false,
    visibility: event.visibilityFlags?.map((v: string) => v === '1' ? 1 : 0) || [],
    stance: event.stance || 'Orthodox',
    punchResult: event.punchResult || 'Unknown',
    defenseType: event.punchResult === 'Defended' ? event.defenseType : null,
    labeledBy: event.labeledBy,
    labeledByEmail: event.labeledByEmail,
  };
}

async function backfillReviewedTimestamps() {
  console.log('\n📋 STEP 1: Backfilling reviewedAt timestamps...\n');

  const reviewedAssignments = await prisma.videoAssignment.findMany({
    where: { 
      status: 'REVIEWED',
      reviewedAt: null 
    },
    include: { video: true },
  });

  console.log(`Found ${reviewedAssignments.length} REVIEWED assignments without reviewedAt`);

  if (DRY_RUN) {
    console.log('  [DRY RUN] Would update these assignments:');
    reviewedAssignments.forEach(a => {
      console.log(`    - ${a.video.title}`);
    });
    return reviewedAssignments.length;
  }

  // Update each assignment with reviewedAt = updatedAt (best estimate)
  for (const assignment of reviewedAssignments) {
    await prisma.videoAssignment.update({
      where: { id: assignment.id },
      data: { reviewedAt: assignment.updatedAt },
    });
    console.log(`  ✅ Updated: ${assignment.video.title}`);
  }

  return reviewedAssignments.length;
}

async function backfillLabeledBy() {
  console.log('\n📋 STEP 2: Backfilling labeledBy on events...\n');

  // Get events without labeledBy, grouped by assignment
  const eventsWithoutLabeler = await prisma.event.findMany({
    where: { labeledBy: null },
    include: {
      assignment: {
        include: { 
          user: { select: { id: true, email: true } },
          video: { select: { title: true } }
        }
      }
    }
  });

  console.log(`Found ${eventsWithoutLabeler.length} events without labeledBy`);

  if (DRY_RUN) {
    const byAssignment = new Map<string, number>();
    eventsWithoutLabeler.forEach(e => {
      const key = e.assignment.video.title;
      byAssignment.set(key, (byAssignment.get(key) || 0) + 1);
    });
    console.log('  [DRY RUN] Would update events by video:');
    byAssignment.forEach((count, title) => {
      console.log(`    - ${title}: ${count} events`);
    });
    return eventsWithoutLabeler.length;
  }

  // Update each event with the assigned user's info
  let updated = 0;
  for (const event of eventsWithoutLabeler) {
    await prisma.event.update({
      where: { id: event.id },
      data: {
        labeledBy: event.assignment.user.id,
        labeledByEmail: event.assignment.user.email,
      },
    });
    updated++;
    if (updated % 100 === 0) {
      console.log(`  Progress: ${updated}/${eventsWithoutLabeler.length}`);
    }
  }

  console.log(`  ✅ Updated ${updated} events with labeledBy info`);
  return updated;
}

async function resendToExternalAPI() {
  console.log('\n📋 STEP 3: Re-sending data to external API...\n');

  if (SKIP_EXTERNAL) {
    console.log('  [SKIPPED] --skip-external flag set');
    return { sent: 0, failed: 0 };
  }

  // Get all SUBMITTED and REVIEWED assignments with their events
  const assignments = await prisma.videoAssignment.findMany({
    where: {
      status: { in: ['SUBMITTED', 'REVIEWED'] }
    },
    include: {
      video: true,
      user: { select: { id: true, email: true } },
      events: true,
    },
    orderBy: { submittedAt: 'asc' }
  });

  console.log(`Found ${assignments.length} assignments to re-send`);

  let sent = 0;
  let failed = 0;

  for (const assignment of assignments) {
    const isQCReview = assignment.status === 'REVIEWED';
    const video = assignment.video;
    const events = assignment.events as EventData[];

    // Build rounds structure
    const roundKey = `RD${video.round}`;
    const numCameras = video.numCameraViews || 3;

    // Group events by camera
    const cameras: { [key: string]: any[] } = {};
    for (let i = 1; i <= numCameras; i++) {
      cameras[`Cam${i}`] = [];
    }

    events.forEach(event => {
      const cam = event.cam || 'CAM 1';
      const normalizedCam = cam.replace(/CAM\s*/i, 'Cam').replace(/\s+/g, '');
      if (cameras[normalizedCam]) {
        cameras[normalizedCam].push(transformEventForExternalAPI(event));
      } else {
        cameras['Cam1'].push(transformEventForExternalAPI(event));
      }
    });

    // Build payload
    const payload: Record<string, any> = {
      fight_title: video.title,
      [roundKey]: cameras,
      metadata: {
        venue: video.venue || '',
        date: video.fightDate?.toISOString().split('T')[0] || '',
        weight_class: video.weightClass || '',
        num_cameras: numCameras,
      },
      submittedBy: {
        userId: assignment.user.id,
        email: assignment.user.email,
        timestamp: assignment.submittedAt?.toISOString() || new Date().toISOString(),
      },
      isQCReview: isQCReview,
      reviewedBy: isQCReview ? {
        userId: assignment.user.id,
        email: assignment.user.email,
        timestamp: assignment.reviewedAt?.toISOString() || assignment.updatedAt.toISOString(),
      } : null,
      isBackfill: true,
    };

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would send ${isQCReview ? 'PUT' : 'POST'}: ${video.title}`);
      console.log(`    Events: ${events.length}, Cameras: ${Object.keys(cameras).join(', ')}`);
      sent++;
      continue;
    }

    // Determine the correct endpoint and method
    const httpMethod = isQCReview ? 'PUT' : 'POST';
    const apiUrl = isQCReview
      ? `${EXTERNAL_API_BASE_URL}/fight/${encodeURIComponent(video.title)}`
      : `${EXTERNAL_API_BASE_URL}/boxing_fight`;

    // Send to external API
    try {
      const response = await fetch(apiUrl, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`  ✅ Sent: ${video.title} (${isQCReview ? 'QC' : 'Original'})`);
        sent++;
      } else {
        const errorText = await response.text();
        console.error(`  ❌ Failed: ${video.title} - ${response.status}: ${errorText.substring(0, 100)}`);
        failed++;
      }
    } catch (error) {
      console.error(`  ❌ Error: ${video.title} - ${error}`);
      failed++;
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  return { sent, failed };
}

async function main() {
  console.log('\n========================================');
  console.log('🔧 DATA BACKFILL SCRIPT');
  console.log('========================================');
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }
  if (SKIP_EXTERNAL) {
    console.log('⚠️  SKIP EXTERNAL - External API calls disabled\n');
  }

  try {
    // Step 1: Fix reviewedAt timestamps
    const timestampsFixed = await backfillReviewedTimestamps();

    // Step 2: Fix labeledBy on events
    const eventsFixed = await backfillLabeledBy();

    // Step 3: Re-send to external API
    const { sent, failed } = await resendToExternalAPI();

    // Summary
    console.log('\n========================================');
    console.log('📊 BACKFILL SUMMARY');
    console.log('========================================');
    console.log(`  reviewedAt timestamps fixed: ${timestampsFixed}`);
    console.log(`  Events with labeledBy fixed: ${eventsFixed}`);
    console.log(`  External API - Sent: ${sent}, Failed: ${failed}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
