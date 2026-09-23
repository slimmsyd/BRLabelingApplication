import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const ASSIGN = 'cmpznwdgc0001i604nizehcvn'; // Tellez v Mendoza R2
const friStart = new Date('2026-06-05T00:00:00.000Z');
const friEnd   = new Date('2026-06-05T23:59:59.999Z');

async function main() {
  // CLAIM 1: round started Thursday, finished/submitted Friday
  const a = await prisma.videoAssignment.findUnique({
    where: { id: ASSIGN }, select: { assignedAt:true, submittedAt:true, status:true },
  });
  console.log(`CLAIM 1 — started ${a!.assignedAt.toISOString().slice(0,10)} (Thu), submitted ${a!.submittedAt!.toISOString().slice(0,10)} (Fri), status=${a!.status}`);

  // CLAIM 2: punches split across two createdAt days
  const ev = await prisma.event.findMany({ where:{assignmentId:ASSIGN}, select:{createdAt:true} });
  const byDay: Record<string,number> = {};
  for (const e of ev) { const d=e.createdAt.toISOString().slice(0,10); byDay[d]=(byDay[d]||0)+1; }
  console.log(`CLAIM 2 — total ${ev.length}; by createdAt day:`, byDay);

  // CLAIM 3: a Friday report filters on createdAt -> excludes the Thursday punches
  const friByCreated = await prisma.event.count({ where:{ assignmentId:ASSIGN, createdAt:{gte:friStart, lte:friEnd} } });
  console.log(`CLAIM 3 — Friday window filtered by createdAt returns: ${friByCreated}  (excludes ${ev.length-friByCreated})`);

  // CLINCHER: same Friday window, but filtered by the round's submittedAt -> returns ALL
  const friBySubmitted = await prisma.event.count({ where:{ assignmentId:ASSIGN, assignment:{ submittedAt:{gte:friStart, lte:friEnd} } } });
  console.log(`CLINCHER — Friday window filtered by submittedAt returns: ${friBySubmitted}  (the fix)`);

  await prisma.$disconnect();
}
main().catch(async e=>{console.error(e);await prisma.$disconnect();process.exit(1);});
