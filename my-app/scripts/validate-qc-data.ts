/**
 * Script to validate QC data and verify colleague's claims
 * Run with: npx ts-node scripts/validate-qc-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('📊 VALIDATING QC DATA - Colleague Claims');
  console.log('========================================\n');

  // 1. Count QC'd rounds (status = REVIEWED)
  console.log('📋 CLAIM: "There are 20 rds already QC\'d"\n');
  
  const reviewedAssignments = await prisma.videoAssignment.findMany({
    where: { status: 'REVIEWED' },
    include: {
      video: true,
      user: { select: { email: true, username: true } },
    },
    orderBy: { reviewedAt: 'desc' },
  });

  console.log(`✅ Total REVIEWED assignments: ${reviewedAssignments.length}`);
  console.log('\nREVIEWED Rounds:');
  reviewedAssignments.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.video.title} | Reviewed: ${a.reviewedAt?.toISOString() || 'N/A'} | By: ${a.user.email}`);
  });

  // 2. Check all assignment statuses
  console.log('\n----------------------------------------');
  console.log('📈 ALL ASSIGNMENT STATUSES:\n');
  
  const statusCounts = await prisma.videoAssignment.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  
  statusCounts.forEach(s => {
    console.log(`  ${s.status}: ${s._count.status}`);
  });

  // 3. Check December 10th data (colleague's reference)
  console.log('\n----------------------------------------');
  console.log('📅 DATA FROM DECEMBER 10, 2025:\n');
  
  const dec10Start = new Date('2025-12-10T00:00:00Z');
  const dec10End = new Date('2025-12-10T23:59:59Z');
  
  const dec10Assignments = await prisma.videoAssignment.findMany({
    where: {
      OR: [
        { submittedAt: { gte: dec10Start, lte: dec10End } },
        { createdAt: { gte: dec10Start, lte: dec10End } },
      ],
    },
    include: {
      video: true,
      events: { take: 3 },
    },
  });

  console.log(`Found ${dec10Assignments.length} assignments from Dec 10th:`);
  dec10Assignments.forEach((a, i) => {
    console.log(`\n  ${i + 1}. Video: ${a.video.title}`);
    console.log(`     fight_title (video.title): ${a.video.title}`);
    console.log(`     Status: ${a.status}`);
    console.log(`     Submitted: ${a.submittedAt?.toISOString() || 'N/A'}`);
    console.log(`     Events count: ${a.events.length}+`);
    if (a.events[0]) {
      console.log(`     Sample event labeledBy: ${a.events[0].labeledBy || 'NULL'}`);
      console.log(`     Sample event labeledByEmail: ${a.events[0].labeledByEmail || 'NULL'}`);
    }
  });

  // 4. Check if events have labeledBy data
  console.log('\n----------------------------------------');
  console.log('👤 EVENT LABELING ATTRIBUTION:\n');
  
  const eventsWithLabeledBy = await prisma.event.count({
    where: { labeledBy: { not: null } },
  });
  
  const eventsWithoutLabeledBy = await prisma.event.count({
    where: { labeledBy: null },
  });
  
  const totalEvents = eventsWithLabeledBy + eventsWithoutLabeledBy;
  
  console.log(`  Total events: ${totalEvents}`);
  console.log(`  With labeledBy: ${eventsWithLabeledBy} (${((eventsWithLabeledBy/totalEvents)*100).toFixed(1)}%)`);
  console.log(`  Without labeledBy: ${eventsWithoutLabeledBy} (${((eventsWithoutLabeledBy/totalEvents)*100).toFixed(1)}%)`);

  // 5. Check video titles (fight_title)
  console.log('\n----------------------------------------');
  console.log('🥊 FIGHT TITLES IN DATABASE:\n');
  
  const videos = await prisma.video.findMany({
    select: {
      id: true,
      title: true,
      boxer1: true,
      boxer2: true,
      round: true,
    },
    take: 20,
  });

  console.log(`Found ${videos.length} videos:`);
  videos.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.title} (${v.boxer1} vs ${v.boxer2}, Round ${v.round})`);
  });

  // 6. Sample event data to verify structure
  console.log('\n----------------------------------------');
  console.log('🔍 SAMPLE EVENTS (latest 5):\n');
  
  const sampleEvents = await prisma.event.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      assignment: {
        include: { video: { select: { title: true } } },
      },
    },
  });

  sampleEvents.forEach((e, i) => {
    console.log(`\n  Event ${i + 1}:`);
    console.log(`    Video: ${e.assignment.video.title}`);
    console.log(`    startTime: ${e.startTime}`);
    console.log(`    endTime: ${e.endTime}`);
    console.log(`    labeledBy: ${e.labeledBy || 'NULL'}`);
    console.log(`    labeledByEmail: ${e.labeledByEmail || 'NULL'}`);
    console.log(`    punchType: ${e.punchType}`);
    console.log(`    createdAt: ${e.createdAt.toISOString()}`);
  });

  console.log('\n========================================');
  console.log('✅ VALIDATION COMPLETE');
  console.log('========================================\n');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
