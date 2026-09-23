/**
 * READ-ONLY investigation: Tellez v Mendoza R2 — 132 labeled vs 86 in CSV.
 * Finds where the missing ~46 events live (other assignment? duplicate video? other label type?).
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const VIDEO_ID = 'cmpzltzd70000jp04w4ihdk1x';
const ASSIGNMENT_ID = 'cmpznwdgc0001i604nizehcvn';
const LABELER_ID = 'cmja0k21v0000gs04a73l70io';

function day(d: Date) { return d.toISOString().slice(0, 10); }

async function main() {
  // 1. EXACT round-export query for this video.
  const roundEvents = await prisma.event.findMany({
    where: { assignment: { videoId: VIDEO_ID } },
    include: { assignment: { select: { id: true, status: true, labelType: true, userEmail: true, videoId: true } } },
  });
  console.log(`\n[1] ROUND EXPORT query (assignment.videoId=${VIDEO_ID}) -> ${roundEvents.length} events`);
  const byAssign = new Map<string, number>();
  for (const e of roundEvents) byAssign.set(e.assignmentId, (byAssign.get(e.assignmentId) ?? 0) + 1);
  for (const [aid, n] of byAssign) console.log(`      assignment ${aid}: ${n}`);

  // 2. All Video records that look like this fight (duplicate detection).
  const videos = await prisma.video.findMany({
    where: {
      OR: [
        { title: { contains: 'Tellez', mode: 'insensitive' } },
        { boxer1: { contains: 'Tellez', mode: 'insensitive' } },
        { boxer2: { contains: 'Mendoza', mode: 'insensitive' } },
      ],
    },
    select: { id: true, title: true, round: true, boxer1: true, boxer2: true, createdAt: true },
  });
  console.log(`\n[2] VIDEO records matching this fight: ${videos.length}`);
  for (const v of videos) {
    const count = await prisma.event.count({ where: { assignment: { videoId: v.id } } });
    const assignments = await prisma.videoAssignment.findMany({
      where: { videoId: v.id },
      select: { id: true, status: true, labelType: true, userEmail: true },
    });
    console.log(`      VIDEO ${v.id}  "${v.title}"  R${v.round}  events=${count}  created=${day(v.createdAt)}`);
    for (const a of assignments) {
      const an = await prisma.event.count({ where: { assignmentId: a.id } });
      console.log(`          assignment ${a.id}  ${a.labelType}  ${a.status}  ${a.userEmail}  events=${an}`);
    }
  }

  // 3. Everything this labeler created for this fight, grouped by videoId + day.
  const mine = await prisma.event.findMany({
    where: {
      labeledBy: LABELER_ID,
      OR: [
        { fightTitle: { contains: 'Tellez', mode: 'insensitive' } },
        { assignment: { video: { title: { contains: 'Tellez', mode: 'insensitive' } } } },
      ],
    },
    include: { assignment: { select: { videoId: true, id: true, labelType: true, status: true } } },
  });
  console.log(`\n[3] Events by labeler ${LABELER_ID} for this fight: ${mine.length} total`);
  const grid = new Map<string, number>();
  for (const e of mine) {
    const k = `video=${e.assignment.videoId} | assign=${e.assignmentId} | ${e.assignment.labelType} | ${e.assignment.status} | ${day(e.createdAt)}`;
    grid.set(k, (grid.get(k) ?? 0) + 1);
  }
  for (const [k, n] of [...grid.entries()].sort()) console.log(`      ${n.toString().padStart(4)}  ${k}`);

  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
