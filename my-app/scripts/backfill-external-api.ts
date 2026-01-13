/**
 * Backfill Script: Send all historical events to external API
 * 
 * This script re-sends all SUBMITTED/REVIEWED/COMPLETED video events
 * to the huemanAPI with the new fields:
 * - submittedBy
 * - labeledBy, labeledByEmail per event
 * - startTimeFormatted, endTimeFormatted per event
 * - isQCReview, reviewedBy
 * 
 * Usage: npx ts-node scripts/backfill-external-api.ts
 * 
 * Options:
 *   --dry-run    Log what would be sent without actually sending
 *   --video-id   Only process a specific video ID
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXTERNAL_API_URL = 'https://www.huemanAPI.com/boxing_fight';

// Parse command line args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const VIDEO_ID_INDEX = args.indexOf('--video-id');
const SPECIFIC_VIDEO_ID = VIDEO_ID_INDEX !== -1 ? args[VIDEO_ID_INDEX + 1] : null;

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

// Parse time string to seconds
function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length < 2) return 0;

  const mins = parseInt(parts[0]) || 0;
  const rest = parts[1];
  if (!rest) return mins * 60;

  const secParts = rest.split('.');
  const secs = parseInt(secParts[0]) || 0;
  const ms = parseInt(secParts[1] || '0') || 0;

  return mins * 60 + secs + ms / 100;
}

// Convert visibility flags to matrix
function visibilityFlagsToMatrix(flags: string[]): number[] {
  const flagOrder = ['Full Body', 'Forward/Profile', 'Origin', 'Trajectory', 'Impact'];
  return flagOrder.map(flag => flags.includes(flag) ? 1 : 0);
}

// Transform event to external API format
function transformEvent(event: EventData) {
  return {
    eventType: "punch",
    fighter: event.boxer === 'Boxer A' ? 'boxer1' : 'boxer2',
    startTime: parseTimeToSeconds(event.startTime),
    endTime: parseTimeToSeconds(event.endTime),
    startTimeFormatted: event.startTime,
    endTimeFormatted: event.endTime,
    hand: event.hand.toLowerCase(),
    punchType: event.punchType,
    target: event.target,
    punchQuality: event.punchQuality,
    knockdown: event.knockdown,
    stoppageKo: false,
    visibility: visibilityFlagsToMatrix(event.visibilityFlags),
    stance: event.stance || 'Orthodox',
    punchResult: event.punchResult || (event.landed !== false ? 'Landed' : 'Missed'),
    defenseType: event.punchResult === 'Defended' ? event.defenseType : null,
    labeledBy: event.labeledBy,
    labeledByEmail: event.labeledByEmail,
  };
}

// Group events by camera
function groupEventsByCamera(events: EventData[], numCameras: number) {
  const cameras: { [key: string]: any[] } = {};

  for (let i = 1; i <= numCameras; i++) {
    cameras[`Cam${i}`] = [];
  }

  events.forEach(event => {
    const camKey = event.cam || 'Cam1';
    const normalizedCam = camKey.replace(/CAM\s*/i, 'Cam').replace(/\s+/g, '');

    if (cameras[normalizedCam]) {
      cameras[normalizedCam].push(transformEvent(event));
    } else {
      cameras['Cam1'].push(transformEvent(event));
    }
  });

  return cameras;
}

async function backfillVideo(assignment: any) {
  const video = assignment.video;
  const events = assignment.events;
  const user = assignment.user;

  if (events.length === 0) {
    console.log(`  ⏭️  Skipping - no events`);
    return { success: false, reason: 'no-events' };
  }

  // Determine if this is a QC review (REVIEWED or COMPLETED status)
  const isQCReview = ['REVIEWED', 'COMPLETED'].includes(assignment.status);

  // Build the payload
  const roundKey = `RD${video.round || 1}`;
  const numCameras = video.numCameraViews || 3;

  const rounds: { [key: string]: { [cam: string]: any[] } } = {};
  rounds[roundKey] = groupEventsByCamera(events, numCameras);

  // Build payload matching his expected format:
  // { "fight_title": "...", "RD1": { "Cam1": [...] }, ... }
  const payload: Record<string, any> = {
    fight_title: video.title || `${video.boxer1} vs ${video.boxer2}`,
    // Rounds at top level (not nested under "rounds")
    ...rounds,
    // Metadata fields
    metadata: {
      venue: video.venue || '',
      date: video.fightDate ? new Date(video.fightDate).toISOString().split('T')[0] : '',
      weight_class: video.weightClass || '',
      num_cameras: numCameras
    },
    submittedBy: {
      userId: user?.id || 'unknown',
      email: user?.email || 'unknown',
      timestamp: assignment.submittedAt?.toISOString() || new Date().toISOString(),
    },
    isQCReview: isQCReview,
    reviewedBy: isQCReview ? {
      userId: user?.id || 'unknown',
      email: user?.email || 'unknown',
      timestamp: assignment.reviewedAt?.toISOString() || assignment.updatedAt?.toISOString() || new Date().toISOString(),
    } : null,
    // Mark this as a backfill
    isBackfill: true,
    backfilledAt: new Date().toISOString(),
  };

  if (DRY_RUN) {
    console.log(`  📦 [DRY-RUN] Would send payload:`);
    console.log(`     Fight: ${payload.fight_title}`);
    console.log(`     Events: ${events.length}`);
    console.log(`     isQCReview: ${payload.isQCReview}`);
    console.log(`     submittedBy: ${payload.submittedBy.email}`);
    return { success: true, dryRun: true };
  }

  // Send to external API
  // Use PUT for QC reviews, POST for new submissions (matching live app behavior)
  const httpMethod = isQCReview ? 'PUT' : 'POST';
  
  try {
    const response = await fetch(EXTERNAL_API_URL, {
      method: httpMethod,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  ❌ API Error: ${response.status} - ${errorText.substring(0, 100)}`);
      return { success: false, reason: 'api-error', status: response.status };
    }

    const data = await response.json();
    console.log(`  ✅ Sent successfully`);
    return { success: true, data };
  } catch (error) {
    console.log(`  ❌ Network Error: ${error}`);
    return { success: false, reason: 'network-error', error };
  }
}

async function main() {
  console.log('🔄 External API Backfill Script');
  console.log('================================');
  console.log(`Mode: ${DRY_RUN ? '🔬 DRY-RUN (no actual sends)' : '🔴 LIVE'}`);
  if (SPECIFIC_VIDEO_ID) {
    console.log(`Filtering: Video ID ${SPECIFIC_VIDEO_ID}`);
  }
  console.log('');

  // Query all assignments that need backfilling
  const whereClause: any = {
    status: { in: ['SUBMITTED', 'REVIEWED', 'COMPLETED'] },
  };

  if (SPECIFIC_VIDEO_ID) {
    whereClause.videoId = SPECIFIC_VIDEO_ID;
  }

  const assignments = await prisma.videoAssignment.findMany({
    where: whereClause,
    include: {
      video: true,
      user: true,
      events: true,
    },
    orderBy: { updatedAt: 'asc' },
  });

  console.log(`📊 Found ${assignments.length} assignments to backfill\n`);

  const results = {
    total: assignments.length,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (const assignment of assignments) {
    console.log(`📹 ${assignment.video.title} (${assignment.status})`);
    console.log(`   Assignment: ${assignment.id}`);
    console.log(`   Events: ${assignment.events.length}`);

    const result = await backfillVideo(assignment);

    if (result.success) {
      results.success++;
    } else if (result.reason === 'no-events') {
      results.skipped++;
    } else {
      results.failed++;
    }

    console.log('');
  }

  console.log('================================');
  console.log('📈 Backfill Summary');
  console.log(`   Total: ${results.total}`);
  console.log(`   ✅ Success: ${results.success}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⏭️  Skipped: ${results.skipped}`);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
  process.exit(1);
});

