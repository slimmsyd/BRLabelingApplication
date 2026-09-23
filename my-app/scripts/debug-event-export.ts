/**
 * Debug: why are events visible in the app but missing from a CSV export?
 *
 * READ-ONLY. Makes no writes. Safe to run against production.
 *
 * Usage:
 *   npx tsx scripts/debug-event-export.ts "<search>"
 *
 *   <search> can be a fight title, a boxer name, or a videoId.
 *   It matches Video.title / boxer1 / boxer2 / id (case-insensitive contains).
 *
 * What it does:
 *   1. Finds every Video record matching <search>.
 *   2. For each, runs the EXACT round-export query (`assignment: { videoId }`)
 *      and reports the event count + per-assignment breakdown + createdAt span.
 *   3. Flags OTHER video records that look like the same fight/round but have a
 *      different id (the classic "app labeled video A, picker exported video B"
 *      duplicate-record bug).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const search = process.argv[2];
  if (!search) {
    console.error('Usage: npx tsx scripts/debug-event-export.ts "<fight title | boxer | videoId>"');
    process.exit(1);
  }

  const videos = await prisma.video.findMany({
    where: {
      OR: [
        { id: search },
        { title: { contains: search, mode: 'insensitive' } },
        { boxer1: { contains: search, mode: 'insensitive' } },
        { boxer2: { contains: search, mode: 'insensitive' } },
      ],
    },
  });

  if (videos.length === 0) {
    console.log(`No Video records matched "${search}".`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n=== Matched ${videos.length} Video record(s) for "${search}" ===`);

  for (const v of videos) {
    console.log(`\n────────────────────────────────────────────────────────`);
    console.log(`VIDEO  id=${v.id}`);
    console.log(`       title="${v.title}"  round=${v.round}`);
    console.log(`       boxer1="${v.boxer1}"  boxer2="${v.boxer2}"`);
    console.log(`       externalFightTitle="${v.externalFightTitle}"  externalRoundId="${v.externalRoundId}"`);

    // EXACT round-export query: where { assignment: { videoId } }
    const events = await prisma.event.findMany({
      where: { assignment: { videoId: v.id } },
      include: { assignment: { select: { id: true, status: true, userEmail: true, labelType: true } } },
    });

    console.log(`  ROUND-EXPORT query (assignment.videoId=${v.id}) -> ${events.length} event(s)`);
    console.log(`  >> This is the number of rows the Round Export CSV should contain for this video.`);

    if (events.length > 0) {
      const dates = events.map(e => e.createdAt).sort((a, b) => a.getTime() - b.getTime());
      console.log(`  createdAt span: ${dates[0].toISOString()}  ->  ${dates[dates.length - 1].toISOString()}`);

      // Per-assignment breakdown — the app view shows ONE assignment at a time.
      const byAssignment = new Map<string, { count: number; status: string; email: string | null; labelType: string }>();
      for (const e of events) {
        const a = e.assignment;
        const cur = byAssignment.get(a.id) ?? { count: 0, status: a.status, email: a.userEmail, labelType: a.labelType };
        cur.count++;
        byAssignment.set(a.id, cur);
      }
      console.log(`  Per-assignment breakdown (app view = ONE of these at a time):`);
      for (const [aid, info] of byAssignment) {
        console.log(`    assignment=${aid}  events=${info.count}  status=${info.status}  labelType=${info.labelType}  user=${info.email}`);
      }
    }
  }

  // Duplicate-fight detection: same boxers/round, different video id.
  if (videos.length > 1) {
    console.log(`\n=== ⚠ ${videos.length} separate Video records matched. ===`);
    console.log(`If the app was labeled under one video id but the export picker selected another,`);
    console.log(`the Round Export would legitimately miss those events. Compare the per-video counts above`);
    console.log(`against which video id you actually selected in the export picker.`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
