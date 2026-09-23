/**
 * Reproduce the client's bug: "ran report for Friday, don't see Thursday's labels."
 * Replicates the EXACT date-range export query (createdAt between start/end).
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const VIDEO_ID = 'cmpzltzd70000jp04w4ihdk1x'; // Tellez v Mendoza R2

async function reportFor(label: string, startISO: string, endISO: string) {
  const startDate = new Date(startISO);
  const endDate = new Date(endISO);
  // EXACT query the export uses (exportType='all'):
  const events = await prisma.event.findMany({
    where: { createdAt: { gte: startDate, lte: endDate } },
    include: { assignment: { select: { videoId: true } } },
  });
  const tellez = events.filter(e => e.assignment.videoId === VIDEO_ID);
  console.log(`\n=== ${label}  (${startISO} .. ${endISO}) ===`);
  console.log(`  whole report total events: ${events.length}`);
  console.log(`  Tellez R2 events in report: ${tellez.length}   <-- round actually has 132`);
}

async function main() {
  await reportFor('FRIDAY ONLY (what he ran)',   '2026-06-05T00:00:00.000Z', '2026-06-05T23:59:59.999Z');
  await reportFor('THURSDAY ONLY',               '2026-06-04T00:00:00.000Z', '2026-06-04T23:59:59.999Z');
  await reportFor('THU+FRI (the fix / workaround)','2026-06-04T00:00:00.000Z', '2026-06-05T23:59:59.999Z');
  await prisma.$disconnect();
}
main().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1); });
